const express = require('express');
const router = express.Router();
const { registerCitizen, loginCitizen, logoutCitizen } = require('../controllers/auth.controller');
const { registerAuthority, loginAuthority, logoutAuthority, updateAuthorityLocation } = require('../controllers/auth.controller');
const { registerAdmin, loginAdmin, logoutAdmin, getAllAuthorities, getProfile, updateProfile, changePassword } = require('../controllers/auth.controller');
const { verifyToken, verifyCitizenRole, verifyAuthorityRole, verifyAdminRole } = require('../middlewares/auth.middleware');


//citizen api

router.post('/citizen/register', registerCitizen);
router.post('/citizen/login', loginCitizen);
router.post('/citizen/logout', logoutCitizen);



//authority api

router.post('/authority/register', registerAuthority);
router.post('/authority/login', loginAuthority);
router.post('/authority/logout', logoutAuthority);
router.patch('/authority/location', verifyToken, updateAuthorityLocation);

//admin api

router.post('/admin/register', registerAdmin);
router.post('/admin/login', loginAdmin);
router.post('/admin/logout', logoutAdmin);
router.get('/admin/authorities', verifyToken, verifyAdminRole, getAllAuthorities);

// Profile (all roles)
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, updateProfile);
router.post('/change-password', verifyToken, changePassword);

module.exports = router;