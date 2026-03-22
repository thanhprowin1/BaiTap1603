var express = require('express');
var router = express.Router();
let { checkLogin } = require('../utils/authHandler')
let reservationController = require('../controllers/reservations')
let mongoose = require('mongoose')

// Reserve cart
router.post('/reserveACart', checkLogin, async function (req, res, next) {
    try {
        let userId = req.userId
        let reservation = await reservationController.ReserveACart(userId)
        res.send(reservation)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

// Reserve specific items
router.post('/reserveItems', checkLogin, async function (req, res, next) {
    try {
        let userId = req.userId
        let { items } = req.body
        let reservation = await reservationController.ReserveItems(userId, items)
        res.send(reservation)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

// Cancel reservation (in transaction)
router.post('/cancelReserve/:id', checkLogin, async function (req, res, next) {
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        let userId = req.userId
        let reservationId = req.params.id
        let reservation = await reservationController.CancelReserve(reservationId, userId, session)
        await session.commitTransaction()
        res.send(reservation)
    } catch (error) {
        await session.abortTransaction()
        res.status(400).send({ message: error.message })
    } finally {
        session.endSession()
    }
})

module.exports = router;
