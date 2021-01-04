const User = require('../../../models/users');
const jwt = require('jsonwebtoken');
const env = require('../../../config/environment');
const bcrypt = require('bcrypt');
const { transporter } = require('../../../config/nodemailer');


module.exports.updateUser = async function (req, res) {
  try {
    let isMatch = await bcrypt.compare(req.body.password, req.user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: 'Incorrect Password',
      });
    }

    if (!req.body.email || !req.body.name) {
      return res.status(404).json({
        message: 'Wrong update content',
      });
    }

    // Checking the email is available or not
    let user = await User.findOne({ email: req.body.email }).select(
      '_id name email avatar bio'
    );

    if (user) {
      if (user.id !== req.user.id) {
        return res.status(404).json({
          message: 'Email already registered',
        });
      }
    } else {
      // Actual owner which will be updated
      user = await User.findById(req.user._id).select(
        '_id name email avatar bio'
      );
    }

    // Checking the contact is available or not
    // let userForContact = await User.findOne({
    //   contact: req.body.contact
    // }).select('_id name email avatar bio');

    // if (userForContact) {
    //   if (user.id !== userForContact.id) {
    //     return res.status(404).json({
    //       message: 'Same Contact already registered',
    //     });
    //   }
    // }

    // Updating
    let changed = false;
    // will change this with ...
    if (user.name !== req.body.name) {
      user.name = req.body.name;
      changed = true;
    }

    if (user.email !== req.body.email) {
      user.email = req.body.email;
      changed = true;
    }

    if (user.avatar !== req.body.avatar) {
      user.avatar = req.body.avatar;
      changed = true;
    }

    if (user.bio !== req.body.bio) {
      user.bio = req.body.bio;
      changed = true;
    }

    // if (user.contact !== req.body.contact) {
    //   user.contact = req.body.contact;
    //   changed = true;
    // }

    if (changed) {
      await user.save();
    }

    user.password = null;

    return res.status(200).json({
      message: 'user updated successfully',
      user: user,
    });
  } catch (err) {
    console.error(err);
    return res.status(501).json({
      message: 'Internal server error',
    });
  }
};

