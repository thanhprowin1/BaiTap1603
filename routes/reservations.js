var express = require('express');
var router = express.Router();
let { checkLogin } = require('../utils/authHandler')
let reservationController = require('../controllers/reservations')
let mongoose = require('mongoose')

// Get all reservations of user
router.get('/', checkLogin, async function (req, res, next) {
    try {
        let userId = req.userId
        let reservations = await reservationController.GetAllReservations(userId)
        res.send(reservations)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

// Get one reservation by id
router.get('/:id', checkLogin, async function (req, res, next) {
    try {
        let reservationId = req.params.id
        let reservation = await reservationController.GetOneReservation(reservationId)
        if (!reservation) {
            return res.status(404).send({ message: 'Reservation not found' })
        }
        res.send(reservation)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

module.exports = router;

