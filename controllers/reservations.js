let reservationModel = require('../schemas/reservations')
let cartModel = require('../schemas/cart')
let productModel = require('../schemas/products')
let inventoryModel = require('../schemas/inventories')
let mongoose = require('mongoose')

module.exports = {
    // Get all reservations of a user
    GetAllReservations: async function (userId) {
        return await reservationModel.find({
            user: userId
        }).populate('items.product')
    },

    // Get one reservation by id
    GetOneReservation: async function (reservationId) {
        return await reservationModel.findById(reservationId).populate('items.product')
    },

    // Reserve items from cart
    ReserveACart: async function (userId) {
        // Get user's cart
        let cart = await cartModel.findOne({ user: userId })
        if (!cart || cart.items.length === 0) {
            throw new Error('Cart is empty')
        }

        let items = []
        let totalAmount = 0

        // Process each item in cart
        for (let cartItem of cart.items) {
            let product = await productModel.findById(cartItem.product)
            if (!product) {
                throw new Error(`Product ${cartItem.product} not found`)
            }

            let subtotal = product.price * cartItem.quantity
            items.push({
                product: cartItem.product,
                quantity: cartItem.quantity,
                price: product.price,
                subtotal: subtotal
            })
            totalAmount += subtotal

            // Update inventory - increase reserved
            let inventory = await inventoryModel.findOne({ product: cartItem.product })
            if (!inventory) {
                throw new Error(`Inventory for product ${cartItem.product} not found`)
            }
            if (inventory.stock < cartItem.quantity) {
                throw new Error(`Not enough stock for ${product.title}`)
            }

            inventory.reserved += cartItem.quantity
            await inventory.save()
        }

        // Create reservation
        let newReservation = new reservationModel({
            user: userId,
            items: items,
            totalAmount: totalAmount,
            status: 'actived',
            ExpiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        })
        await newReservation.save()

        // Clear cart items
        cart.items = []
        await cart.save()

        return newReservation
    },

    // Reserve specific items
    ReserveItems: async function (userId, items) {
        if (!items || items.length === 0) {
            throw new Error('Items list is empty')
        }

        let reservationItems = []
        let totalAmount = 0

        // Process each item
        for (let item of items) {
            let product = await productModel.findById(item.product)
            if (!product) {
                throw new Error(`Product ${item.product} not found`)
            }

            let subtotal = product.price * item.quantity
            reservationItems.push({
                product: item.product,
                quantity: item.quantity,
                price: product.price,
                subtotal: subtotal
            })
            totalAmount += subtotal

            // Update inventory - increase reserved
            let inventory = await inventoryModel.findOne({ product: item.product })
            if (!inventory) {
                throw new Error(`Inventory for product ${item.product} not found`)
            }
            if (inventory.stock < item.quantity) {
                throw new Error(`Not enough stock for ${product.title}`)
            }

            inventory.reserved += item.quantity
            await inventory.save()
        }

        // Create reservation
        let newReservation = new reservationModel({
            user: userId,
            items: reservationItems,
            totalAmount: totalAmount,
            status: 'actived',
            ExpiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        })
        await newReservation.save()

        return newReservation
    },

    // Cancel reservation (must be in transaction)
    CancelReserve: async function (reservationId, userId, session) {
        let reservation = await reservationModel.findById(reservationId).session(session)
        if (!reservation) {
            throw new Error('Reservation not found')
        }

        // Check if user owns this reservation
        if (reservation.user.toString() !== userId.toString()) {
            throw new Error('You do not have permission to cancel this reservation')
        }

        if (reservation.status === 'cancelled') {
            throw new Error('Reservation is already cancelled')
        }

        if (reservation.status === 'paid') {
            throw new Error('Cannot cancel a paid reservation')
        }

        // Restore inventory
        for (let item of reservation.items) {
            let inventory = await inventoryModel.findOne({ product: item.product }).session(session)
            if (inventory) {
                inventory.reserved -= item.quantity
                await inventory.save({ session })
            }
        }

        // Update reservation status
        reservation.status = 'cancelled'
        await reservation.save({ session })

        return reservation
    }
}
