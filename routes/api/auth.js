const express = require("express");
const User = require("../../models/User");
const router = express.Router();
const auth = require("./../../middleware/auth");
const { check, validationResult } = require("express-validator/check");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("config");

// @route    Get api/auth
// @desc     test
// @access   public
router.get("/", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json(user);
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Sever Error");
    }
});

// @route    post api/auth || Login
// @desc     authenticate user & get token
// @access   public
router.post(
    "/",
    [
        check("email", "Please include a valid email").isEmail(),
        check("password", "Password is required ").exists(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            let user = await User.findOne({ email: email });

            // see if there is a NO user | invalid email OR password
            if (!user) {
                return res.status(400).json({
                    errors: [{ msg: "Invalid credentials" }],
                });
            }

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({
                    errors: [{ msg: "Invalid credentials" }],
                });
            }

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
