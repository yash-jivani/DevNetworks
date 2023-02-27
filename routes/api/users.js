const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator/check");
const User = require("./../../models/User");
const gravatar = require("gravatar");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");

// @route    Post api/users
// @desc     Register user
// @access   public
router.post(
    "/",
    [
        check("name", "name is required").not().isEmpty(),
        check("email", "Please include a valid email").isEmail(),
        check(
            "password",
            "please enter a password with 6 or more char."
        ).isLength({ min: 6 }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password } = req.body;

        try {
            let user = await User.findOne({ email: email });

            // see if the user exist
            if (user) {
                return res.status(400).json({
                    errors: [{ msg: "User already exists" }],
                });
            }

            // get user gravatar
            const avatar = gravatar.url(email, {
                s: "200",
                r: "pg",
                d: "mm",
            });
            user = new User({ name, email, avatar, password });

            // encrypt password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();

            // return the jsonwebtoken
            const payload = {
                user: {
                    id: user.id,
                },
            };

            jwt.sign(
                payload,
                config.get("jwtSecret"),
                { expiresIn: 36000 },
                (err, token) => {
                    if (err) {
                        throw err;
                    } else {
                        // console.log(token);
                        res.json({ token });
                    }
                }
            );
        } catch (err) {
            console.log(err.message);
            res.status(500).send("Server error");
        }
    }
);

module.exports = router;
