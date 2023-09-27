const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// relativt till notes/
router.get('/', async (req, res) => {

    const notes = await prisma.notes.findMany({
        where: { userId: req.authUser.sub }
    })

    console.log("notes GET")
    res.send({
        msg: 'notes',
        notes: notes,
        authorizedUserId: req.authUser.sub
    })
})

router.get('/:id', async (req, res) => {

    try {

        const note = await prisma.notes.findUnique({
            where: { id: parseInt(req.params.id) }
        })

        console.log("notes GET ONE")
        res.send({ msg: 'notes', note: note })
        
    } catch (err) {
        console.log(err)
        res.status(404).send({
            msg: 'ERROR',
            error: 'Note not found'
        })
    }
})


router.post('/', async (req, res) => {

    const note = await prisma.notes.create({
        data: {
            userId: req.authUser.sub,
            noteText: req.body.text,
        },
    })
    console.log("note created:", note)
    res.send({ msg: 'note created', id: note.id })
})

router.patch('/:id', async (req, res) => {

    const note = await prisma.notes.update({
        where: {
            id: parseInt(req.params.id),
        },
        data: {
            noteText: req.body.text,
            updatedAt: new Date()
        },
    })
    res.send({
        msg: 'patch',
        id: req.params.id,
        note: note
    })
})

router.delete('/:id', async (req, res) => {

    try {

        const note = await prisma.notes.delete({
            where: {
                id: parseInt(req.params.id),
            }
        })
        res.send({
            msg: 'deleted',
            id: req.params.id,
            note: note
        })
    } catch (err) {

        console.log(err)
        res.status(400).send({
            msg: 'ERROR',
            error: 'Note not found'
        })
    }
})

module.exports = router