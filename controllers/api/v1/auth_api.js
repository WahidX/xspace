const User = require('../../../models/users');
const jwt = require('jsonwebtoken');
const env = require('../../../config/environment');
const bcrypt = require('bcrypt');
const { transporter } = require('../../../config/nodemailer');


module.exports.createUser = async function (req, res) {
  try {
    if (req.body.password !== req.body.confirm_password) {
      return res.status(422).json({
        message: "Passwords didn't match!",
      });
    }

    let user = await User.findOne({ email: req.body.email });
    if (user) {
      return res.status(422).json({
        message: 'Email is already registered',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    let newUser = await User.create({
      email: req.body.email,
      password: hashedPassword,
      name: req.body.name,
    });

    newUser.password = null;

    let tokenToSend;
    jwt.sign(
      { _id: newUser._id },
      env.jwt_secret,
      {
        expiresIn: '1d',
      },
      (err, token) => {
        if (err) {
          console.log('Err: ', err);
          return res.status(500).json({
            message: 'Internal Server Error',
          });
        }

        const url = `${env.base_url}/api/${env.api_v}/users/econfirmation/${token}`;
        tokenToSend = token;

        transporter.sendMail({
          to: newUser.email,
          subject: 'Confirm Email',
          html: `<h2>Hi, ${newUser.name}, <p>Please confirm your email.</p><p><a href=${url}>Click Here</a></p></h2>`,
        });
      }
    );

    return res.status(200).json({
      message: 'User created Successfully',
      success: true,
      data: {
        user: newUser,
        token: jwt.sign({ _id: newUser._id }, env.jwt_secret, {
          expiresIn: '10000000',
        }),
      },
    });
  } catch (err) {
    console.log('Err:  ', err);
    return res.status(500).json({
      message: 'Internal Server Error',
    });
  }
};

module.exports.createSession = async function (req, res) {
  try {
    let user = await User.findOne({ email: req.body.email }).populate({
      path: 'friends',
      select: 'name _id email',
    });

    let isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
      return res.status(422).json({
        message: 'Incorrect email/password',
      });
    }

    user.password = null;

    return res.json(200, {
      message: "Sign in successful, here's your token",
      data: {
        user: user,
        token: jwt.sign({ _id: user._id }, env.jwt_secret, {
          expiresIn: '10000000',
        }),
      },
    });
  } catch (err) {
    console.log('Err : ', err);
    return res.json(500, {
      message: 'Internal Server Error',
    });
  }
};


module.exports.changePassword = async function (req, res) {
  try {
    if (
      !req.body.oldPassword ||
      !req.body.oldPassword ||
      !req.body.confirmPassword ||
      req.body.newPassword !== req.body.confirmPassword
    ) {
      return res.status(400).json({
        message: 'Invalid request',
      });
    }

    let isMatch = await bcrypt.compare(req.body.oldPassword, req.user.password);
    if (isMatch) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);
      req.user.password = hashedPassword;
      req.user.save();

      return res.status(200).json({
        message: 'Password Changed Successfully',
      });
    }

    return res.status(401).json({
      message: 'Incorrect Password',
    });
  } catch (err) {
    console.log('Err: ', err);
    return res.status(501).json({
      message: 'Internal Server Error',
    });
  }
};

module.exports.confirmEmail = async function (req, res) {
  // '/econfirmation/:jwt'
  try {
    const jwtContent = jwt.verify(req.params.jwt, env.jwt_secret);
    let user = await User.findById(jwtContent._id);
    if (user) {
      user.emailAuthenticated = true;
      user.save();

      // return res.redirect(env.front_base_url);
      return res.send('Email Confirmed!  You can close this page now!');
    } else {
      return res.status(422).json({
        message: 'Token expired please initiate again',
      });
    }
  } catch (err) {
    console.log('Err: ', err);
    return res.status(501).json({
      message: 'Internal Server Error',
    });
  }
};

module.exports.resendConfirmationMail = async function (req, res) {
  let tokenToSend;
  jwt.sign(
    { _id: req.user._id },
    env.jwt_secret,
    {
      expiresIn: '1d',
    },
    (err, token) => {
      if (err) {
        console.log('Err: ', err);
        return res.status(500).json({
          message: 'Internal Server Error',
        });
      }

      const url = `${env.base_url}/api/${env.api_v}/users/econfirmation/${token}`;
      tokenToSend = token;

      transporter.sendMail({
        to: req.user.email,
        subject: 'Confirm Email',
        html: `<h2>Hi, ${req.user.name}, <p>Please confirm your email.</p><p><a href=${url}>Click Here</a></p></h2>`,
      });
    }
  );

  return res.status(200).json({
    message: 'Email sent successfully',
  });
};
