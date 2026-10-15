const { Room } = require('../models');
const { getMembers } = require('../realtime/presence');
const ensureSessionUser = require('../utils/userSession');

// Where-clause matching rooms hosted by this session user (registered or guest)
function hostWhere(user) {
  return user.type === 'registered'
    ? { hostId: user.id }
    : { hostGuestId: user.guestId };
}

// Creates a room hosted by the current user, or by a new guest if there is no session
async function createRoom (req, res) {
  try {
    ensureSessionUser(req);

    const room = await Room.create(hostWhere(req.session.user));

    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Failed to create room' });
      }
      res.status(201).json({ roomId: room.id });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to create room' });
  }
}

// Returns a room and its live members; gives anonymous visitors a guest session so they can join
async function getRoom(req, res) {
  try {
    const id = Number(req.params.id);
    const room = Number.isInteger(id) ? await Room.findByPk(id) : null;
    if (!room) {
      return res.status(404).json({ msg: 'Room not found' });
    }

    ensureSessionUser(req);
    const members = await getMembers(room.id);

    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Failed to load room' });
      }
      res.json({ room: { id: room.id }, members });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to load room' });
  }
}

// Deletes a room, only if the current user is its host
async function deleteRoom(req, res) {
  try {
    const deleted = await Room.destroy({
      where: {
        id: req.params.id,
        ...hostWhere(req.session.user)
      }
    });
    if (!deleted) {
      return res.status(404).json({ msg: 'Room not found' });
    }
    res.json({ msg: 'Room deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error while deleting room' });
  }
}

module.exports = { createRoom, getRoom, deleteRoom };
