'use strict';
const {
  Model
} = require('sequelize');
const crypto = require('crypto');

const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
    // 12 random chars (60 bits); randomInt avoids modulo bias
    static newSlug() {
      return Array.from({ length: 12 }, () => SLUG_ALPHABET[crypto.randomInt(SLUG_ALPHABET.length)]).join('');
    }

    // 24 random bytes -> 32 url-safe chars
    static newInviteToken() {
      return crypto.randomBytes(24).toString('base64url');
    }

    // Constant-time check of an invite token from a link
    hasInviteToken(given) {
      if (typeof given !== 'string') {
        return false;
      }
      const a = Buffer.from(this.inviteToken);
      const b = Buffer.from(given);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    // True if the session user (registered or guest) hosts this room
    isHostedBy(user) {
      return user.type === 'registered'
        ? this.hostId === user.id
        : this.hostGuestId === user.guestId;
    }

    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Room.belongsTo(models.User, { foreignKey: 'hostId', as: 'hostUser' });
    }
  }
  Room.init({
    // Exactly one of hostId (registered user) / hostGuestId (guest session id) is set
    hostId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hostGuestId: {
      type: DataTypes.STRING(36),
      allowNull: true
    },
    // Public address used in URLs (the numeric id is never exposed)
    slug: {
      type: DataTypes.STRING(12),
      allowNull: false,
      unique: true
    },
    // Secret in invite links: holders join without host approval
    inviteToken: {
      type: DataTypes.STRING(32),
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Room',
    hooks: {
      beforeValidate(room) {
        room.slug ??= Room.newSlug();
        room.inviteToken ??= Room.newInviteToken();
      }
    },
    validate: {
      exactlyOneHost() {
        // unset attributes are undefined, not null, so normalise before comparing
        if (((this.hostId ?? null) === null) === ((this.hostGuestId ?? null) === null)) {
          throw new Error('Room must have exactly one of hostId or hostGuestId');
        }
      }
    }
  });
  return Room;
};
