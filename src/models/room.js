'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Room extends Model {
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
    }
  }, {
    sequelize,
    modelName: 'Room',
    validate: {
      exactlyOneHost() {
        if ((this.hostId == null) === (this.hostGuestId == null)) {
          throw new Error('Room must have exactly one of hostId or hostGuestId');
        }
      }
    }
  });
  return Room;
};
