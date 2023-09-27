const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
require('dotenv').config()


// disable for production?
router.get('/', async (req, res) => {
    const users = await prisma.users.findMany()
    console.log("users GET")
    res.send({ 
        msg: 'users', 
        users: users
    })
})

// restrict for production
router.get('/:id', async (req, res) => {

    const userId = parseInt(req.params.id);

    const user = await prisma.users.findUnique({
        where: {id: userId}
    })

    console.log("users GET ONE")
    res.send({ msg: 'users', user: user })
}) 

router.post('/login', async (req, res) => {
    try {
        const user = await prisma.users.findUnique({
            where: {email: req.body.email}
        })

        if (user == null) {
            return res.status(404).send({msg: 'ERROR', error: 'User not found'})
        }

        const match = await bcrypt.compare(req.body.password, user.password)

        if (!match) {
            return res.status(401).send({msg: 'ERROR', error: 'Wrong password'})
        }

        const token = await jwt.sign({ 
            sub: user.id, 
            email: user.email, 
            name: user.name,
            expiresIn: '1d'
        }, process.env.JWT_SECRET)

        res.send({
            token: token, 
            msg: "Login successful", 
            userId: user.id,
            userEmail: user.email
        })

    } catch (error) {
        
    }

})

router.post('/', async (req, res) => {

    const hash = await bcrypt.hash(req.body.password, 12)

    const user = await prisma.users.create({
        data: {
            email: req.body.email,
            name: req.body.name,
            password: hash
        },
    })
    console.log("user created:", user)
    res.send({ msg: 'user created', id: user.id })
})


router.patch('/:id', async (req, res) => {

    const userId = parseInt(req.params.id);

    if (userId != req.authUser.sub) {
        res.status(403).send({
            msg: 'ERROR',
            error: 'Cannot patch other users'
        })
    }

    const hash = null
    if (req.body.password) {
        hash = await bcrypt.hash(req.body.password, 12)
    }

    const user = await prisma.users.update({
        where: {
            id: userId,
        },
        data: {
            password: hash,
            name: req.params.name,
            updatedAt: new Date()
        },
    })
    res.send({
        msg: 'patch',
        id: userId,
        user: user
    })
})

router.delete('/:id', async (req, res) => {

    try {

        const user = await prisma.users.delete({
            where: {
                id: req.params.id,
            }
        })
        res.send({
            msg: 'deleted',
            id: req.params.id,
            user: user
        })
    } catch (err) {

        console.log(err)
        res.send({
            msg: 'ERROR',
            error: err
        })
    }
})


module.exports = router