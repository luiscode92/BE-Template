
const getProfile = async (req, res, next) => {

    const {Profile} = req.app.get('models')
    const profile = await Profile.findOne({where: {id: req.get('profile_id') || 0}})
    profile && console.log("pr", profile)
    if(!profile) return res.status(401).end()
    req.profile = profile
    console.log("pr", profile)
    next()
}
module.exports = {getProfile}