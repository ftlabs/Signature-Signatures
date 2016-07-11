'use strict';
// signatures.js
// Routes to CRUD signatures.

const URL = require('url');

const errors = require('../models/errors');
const Signature = require('../models/signature');

function getSignatureURL(signature) {
    return '/signatures/' + encodeURIComponent(signature.hash);
}

/**
 * GET /signatures
 */
exports.list = function (req, res, next) {
    Signature.getAll(function (err, signatures) {
        if (err) return next(err);
        res.render('signatures', {
            Signature: Signature,
            signatures: signatures,
            hash: req.query.hash,   // Support pre-filling create form
            error: req.query.error,     // Errors creating; see create route
        });
    });
};

/**
 * POST /signatures {hash, ...}
 */
exports.create = function (req, res, next) {
    Signature.create({
        hash: req.body.hash
    }, function (err, signature) {
        if (err) {
            if (err instanceof errors.ValidationError) {
                // Return to the create form and show the error message.
                // TODO: Assuming hash is the issue; hardcoding for that
                // being the only input right now.
                // TODO: It'd be better to use a cookie to "remember" this info,
                // e.g. using a flash session.
                return res.redirect(URL.format({
                    pathname: '/signatures',
                    query: {
                        hash: req.body.hash,
                        error: err.message,
                    },
                }));
            } else {
                return next(err);
            }
        }
        res.redirect(getSignatureURL(signature));
    });
};

/**
 * POST /signatures/:hash {hash, ...}
 */
exports.edit = function (req, res, next) {
    Signature.get(req.params.hash, function (err, signature) {
        // TODO: Gracefully "no such signature" error. E.g. 404 page.
        if (err) return next(err);
        signature.patch(req.body, function (err) {
            if (err) {
                if (err instanceof errors.ValidationError) {
                    // Return to the edit form and show the error message.
                    // TODO: Assuming hash is the issue; hardcoding for that
                    // being the only input right now.
                    // TODO: It'd be better to use a cookie to "remember" this
                    // info, e.g. using a flash session.
                    return res.redirect(URL.format({
                        pathname: getSignatureURL(signature),
                        query: {
                            hash: req.body.hash,
                            error: err.message,
                        },
                    }));
                } else {
                    return next(err);
                }
            }
            res.redirect(getSignatureURL(signature));
        });
    });
};

/**
 * DELETE /signatures/:hash
 */
exports.del = function (req, res, next) {
    Signature.get(req.params.hash, function (err, signature) {
        // TODO: Gracefully handle "no such signature" error somehow.
        // E.g. redirect back to /signatures with an info message?
        if (err) return next(err);
        signature.del(function (err) {
            if (err) return next(err);
            res.redirect('/signatures');
        });
    });
};

/**
 * GET /signatures/:hash
 */
exports.show = function (req, res, next) {
    Signature.get(req.params.hash, function (err, signature) {
        // TODO: Gracefully handle "no such signature" error somehow.
        // E.g. redirect back to /signatures with an info message?
        if (err) return next(err);
        res.render('signature', {
            Signature: Signature,
            signature: signature,
            hash: req.query.hash,   // Support pre-filling edit form
            error: req.query.error,     // Errors editing; see edit route
        });
    });
};
