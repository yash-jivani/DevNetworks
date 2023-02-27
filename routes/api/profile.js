const express = require("express");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator/check");
const request = require("request");
const config = require("config");
const router = express.Router();
const auth = require("./../../middleware/auth");

// @route    Get api/profile/me
// @desc     get current user's profile
// @access   private
router.get("/me", auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id }).populate(
            "user",
            ["name", "avatar"]
        );

        if (!profile) {
            return res
                .status(400)
                .json({ msg: "There is no profile for this user" });
        }

        res.json({ profile });
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server error");
    }
});

// @route    post api/profile
// @desc     create OR update user profile
// @access   private
router.post(
    "/",
    [
        auth,
        check("status", "Status is required").not().isEmpty(),
        check("skills", "Skills is required").not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const {
            company,
            website,
            location,
            bio,
            status,
            githubusername,
            skills,
            youtube,
            facebook,
            twitter,
            instagram,
            linkedin,
        } = req.body;

        // Get fields
        const profileFields = {};
        profileFields.user = req.user.id;
        if (company) profileFields.company = req.body.company;
        if (website) profileFields.website = req.body.website;
        if (location) profileFields.location = req.body.location;
        if (bio) profileFields.bio = req.body.bio;
        if (status) profileFields.status = req.body.status;
        if (githubusername)
            profileFields.githubusername = req.body.githubusername;
        // Skills - Spilt into array
        if (typeof skills !== "undefined") {
            profileFields.skills = req.body.skills
                .split(",")
                .map((skill) => skill.trim());
        }
        // console.log(profileFields.skills);

        // build social object
        profileFields.social = {};
        if (youtube) profileFields.social.youtube = req.body.youtube;
        if (twitter) profileFields.social.twitter = req.body.twitter;
        if (facebook) profileFields.social.facebook = req.body.facebook;
        if (linkedin) profileFields.social.linkedin = req.body.linkedin;
        if (instagram) profileFields.social.instagram = req.body.instagram;

        try {
            let profile = await Profile.findOne({ user: req.user.id });

            if (profile) {
                // update
                profile = await Profile.findOneAndUpdate(
                    { user: req.user.id },
                    { $set: profileFields },
                    { new: true }
                );
                return res.json(profile);
            }

            // create profile
            profile = new Profile(profileFields);
            await profile.save();
            res.json(profile);
        } catch (error) {
            console.log(error.message);
            res.status(500).send("server error");
        }
    }
);

// @route    get api/profile
// @desc     get all profiles
// @access   public
router.get("/", async (req, res) => {
    try {
        const profiles = await Profile.find().populate("user", [
            "name",
            "avatar",
        ]);
        res.json(profiles);
    } catch (err) {
        console.log(err.message);
        res.status(500).send("server error");
    }
});

// @route    get api/profile/user/:user_id
// @desc     get profile by user id
// @access   public
router.get("/user/:user_id", async (req, res) => {
    try {
        const profile = await Profile.findOne({
            user: req.params.user_id,
        }).populate("user", ["name", "avatar"]);
        if (!profile) {
            return res.status(400).json({ msg: "Profile not found!" });
        }
        res.json(profile);
    } catch (err) {
        console.log(err.message);
        if (err.kind == "ObjectId") {
            return res.status(400).json({ msg: "Profile not found!" });
        }
        res.status(500).send("server error");
    }
});

// @route    delete api/profile
// @desc     delete profile, user & post
// @access   private
router.delete("/", auth, async (req, res) => {
    try {
        // @todo - remove users posts

        // remove profile
        await Profile.findOneAndRemove({ user: req.user.id });
        // Remove user
        await User.findOneAndRemove({ _id: req.user.id });

        res.json({ msg: "user deleted" });
    } catch (err) {
        console.log(err.message);
        res.status(500).send("server error");
    }
});

// @route    put api/profile/experience
// @desc     add profile experince
// @access   private
router.put(
    "/experience",
    [
        auth,
        check("title", "Title is required").not().isEmpty(),
        check("company", "Company is required").not().isEmpty(),
        check("from", "From date is required").not().isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { title, company, location, from, to, current, description } =
            req.body;
        const newExp = {
            title,
            company,
            location,
            from,
            to,
            current,
            description,
        };

        try {
            const profile = await Profile.findOne({ user: req.user.id });
            profile.experience.unshift(newExp);
            await profile.save();
            res.json(profile);
        } catch (err) {
            console.log(err.message);
            res.status(500).send("server error");
        }
    }
);

// @route    DELETE api/profile/experience/:exp_id
// @desc     Delete experience from profile
// @access   Private

router.delete("/experience/:exp_id", auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });

        const removeIndex = profile.experience
            .map((item) => item.id)
            .indexOf(req.params.exp_id);
        profile.experience.splice(removeIndex, 1);

        await profile.save();

        return res.status(200).json(profile);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Server error" });
    }
});

// @route    PUT api/profile/education
// @desc     Add profile education
// @access   Private
router.put(
    "/education",
    [
        auth,
        check("school", "School is required").not().isEmpty(),
        check("degree", "Degree is required").not().isEmpty(),
        check("fieldofstudy", "Field of study is required").not().isEmpty(),
        check("from", "From date is required and needs to be from the past")
            .not()
            .isEmpty(),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { school, degree, fieldofstudy, from, to, current, description } =
            req.body;
        const newEdu = {
            school,
            degree,
            fieldofstudy,
            from,
            to,
            current,
            description,
        };
        try {
            const profile = await Profile.findOne({ user: req.user.id });

            profile.education.unshift(newEdu);

            await profile.save();

            res.json(profile);
        } catch (err) {
            console.error(err.message);
            res.status(500).send("Server Error");
        }
    }
);

// @route    DELETE api/profile/education/:edu_id
// @desc     Delete education from profile
// @access   Private

router.delete("/education/:edu_id", auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id });

        const removeIndex = profile.education
            .map((item) => item.id)
            .indexOf(req.params.edu_id);
        profile.education.splice(removeIndex, 1);

        await profile.save();

        return res.status(200).json(profile);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Server error" });
    }
});

// @route    get api/profile/github/:username
// @desc     get user repos from github
// @access   public
router.get("/github/:username", async (req, res) => {
    try {
        const options = {
            uri: `https://api.github.com/users/${
                req.params.username
            }/repos?per_page=5&sort=created:asc&client_id=${config.get(
                "githubclinetId"
            )}&client_secret=${config.get("githubSecret")}`,
            method: "GET",
            headers: { "user-agent": "node.js" },
        };
        request(options, (error, response, body) => {
            if (error) {
                console.log(error);
            }

            if (response.statusCode !== 200) {
                return res.status(404).json({ msg: "No github profile found" });
            }

            res.json(JSON.parse(body));
        });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ msg: "Server error" });
    }
});

module.exports = router;
