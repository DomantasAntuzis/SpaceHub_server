const { Room } = require('../models');
const { getMembers } = require('../realtime/presence');
const { canEnter, clearRoom } = require('../realtime/admission');
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
      res.status(201).json({ slug: room.slug, inviteToken: room.inviteToken });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to create room' });
  }
}

// Returns the room and, if the visitor may enter (host, admitted, or valid ?invite=), its live members.
// Gives anonymous visitors a guest session so they can join or knock.
async function getRoom(req, res) {
  try {
    const room = await Room.findOne({ where: { slug: String(req.params.slug) } });
    if (!room) {
      return res.status(404).json({ msg: 'Room not found' });
    }

    ensureSessionUser(req);
    const user = req.session.user;
    const allowed = await canEnter(room, user, req.query.invite);
    const members = allowed ? await getMembers(room.id) : [];

    req.session.save((err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ msg: 'Failed to load room' });
      }
      res.json({
        room: { slug: room.slug },
        isHost: room.isHostedBy(user),
        inviteToken: room.isHostedBy(user) ? room.inviteToken : undefined,
        allowed,
        members
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Failed to load room' });
  }
}

// Deletes a room, only if the current user is its host
async function deleteRoom(req, res) {
  try {
    const room = await Room.findOne({
      where: {
        slug: String(req.params.slug),
        ...hostWhere(req.session.user)
      }
    });
    if (!room) {
      return res.status(404).json({ msg: 'Room not found' });
    }
    await room.destroy();
    await clearRoom(room.id);
    res.json({ msg: 'Room deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error while deleting room' });
  }
}

module.exports = { createRoom, getRoom, deleteRoom };
