const mongoose = require('mongoose');

function validateObjectIdParam(paramName) {
    return (req, res, next) => {
        const value = req.params[paramName];

        if (!mongoose.Types.ObjectId.isValid(value)) {
            return res.status(400).json({ message: `Invalid ${paramName}` });
        }

        return next();
    };
}

function validatePaginationQuery(req, res, next) {
    const page = req.query.page;
    const limit = req.query.limit;

    if (page !== undefined && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
        return res.status(400).json({ message: 'page must be a positive integer' });
    }

    if (limit !== undefined && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
        return res.status(400).json({ message: 'limit must be an integer between 1 and 100' });
    }

    return next();
}

module.exports = {
    validateObjectIdParam,
    validatePaginationQuery,
};
