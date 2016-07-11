/* global describe, it */
'use strict';

//
// Signature model tests. These are basically CRUD tests, ordered to let us test
// all cases, plus listing all signatures and following/unfollowing between signatures.
//
// It's worth noting that there may already be signatures in the database, so these
// tests must not assume the initial state is empty.
//
// High-level test plan:
//
// - List initial signatures.
// - Create a signature A.
// - Attempt to create another signature with the same hash; should fail.
// - Fetch signature A. Should be the same.
// - List signatures again; should be initial list plus signature A.
// - Update signature A, e.g. its curve data.
// - Fetch signature A again. It should be updated.
// - Delete signature A.
// - Try to fetch signature A again; should fail.
// - List signatures again; should be back to initial list.
//

const expect = require('chai').expect;

const errors = require('../../models/errors');
const Signature = require('../../models/signature');


// Shared state:

let INITIAL_SIGNATURES;
let SIGNATURE_A;


// Helpers:

/**
 * Asserts that the given object is a valid signature model.
 * If an expected signature model is given too (the second argument),
 * asserts that the given object represents the same signature with the same data.
 */
function expectSignature(obj, signature) {
    expect(obj).to.be.an('object');
    expect(obj).to.be.an.instanceOf(Signature);

    if (signature) {
        ['hash'].forEach(function (prop) {
            expect(obj[prop]).to.equal(signature[prop]);
        });
    }
}

/**
 * Asserts that the given array of signatures contains the given signature,
 * exactly and only once.
 */
function expectSignaturesToContain(signatures, expSignature) {
    let found = false;

    expect(signatures).to.be.an('array');
    signatures.forEach(function (actSignature) {
        if (actSignature.hash === expSignature.hash) {
            expect(found, 'Signature already found').to.equal(false);
            expectSignature(actSignature, expSignature);
            found = true;
        }
    });
    expect(found, 'Signature not found').to.equal(true);
}

/**
 * Asserts that the given array of signatures does *not* contain the given signature.
 */
function expectSignaturesToNotContain(signatures, expSignature) {
    expect(signatures).to.be.an('array');
    signatures.forEach(function (actSignature) {
        expect(actSignature.hash).to.not.equal(expSignature.hash);
    });
}

/**
 * Asserts that the given error is a ValidationError with the given message.
 * The given message can also be a regex, to perform a fuzzy match.
 */
function expectValidationError(err, msg) {
    expect(err).to.be.an.instanceOf(Error);
    expect(err).to.be.an.instanceOf(errors.ValidationError);

    if (typeof msg === 'string') {
        expect(err.message).to.equal(msg);
    } else { // regex
        expect(err.message).to.match(msg);
    }
}

/**
 * Asserts that the given error is a ValidationError for the given hash
 * being taken.
 */
function expectSignaturenameTakenValidationError(err, hash) {
    expectValidationError(err, 'The hash ‘' + hash + '’ is taken.');
}


// Tests:

describe('Signature models:', function () {

    // Single signature CRUD:

    it('List initial signatures', function (next) {
        Signature.getAll(function (err, signatures) {
            if (err) return next(err);

            expect(signatures).to.be.an('array');
            signatures.forEach(function (signature) {
                expectSignature(signature);
            });

            INITIAL_SIGNATURES = signatures;
            return next();
        });
    });

    it('Create signature A', function (next) {
        const hash = 'testSignatureA';
        Signature.create({hash: hash}, function (err, signature) {
            if (err) return next(err);

            expectSignature(signature);
            expect(signature.hash).to.equal(hash);

            SIGNATURE_A = signature;
            return next();
        });
    });

    it('Attempt to create signature A again', function (next) {
        Signature.create({hash: SIGNATURE_A.hash}, function (err, signature) {
            expect(signature).to.not.exist;
            expectSignaturenameTakenValidationError(err, SIGNATURE_A.hash);
            return next();
        });
    });

    it('Fetch signature A', function (next) {
        Signature.get(SIGNATURE_A.hash, function (err, signature) {
            if (err) return next(err);
            expectSignature(signature, SIGNATURE_A);
            return next();
        });
    });

    it('List signature again', function (next) {
        Signature.getAll(function (err, signatures) {
            if (err) return next(err);

            // The order isn't part of the contract, so we just test that the
            // new array is one longer than the initial, and contains signature A.
            expect(signatures).to.be.an('array');
            expect(signatures).to.have.length(INITIAL_SIGNATURES.length + 1);
            expectSignaturesToContain(signatures, SIGNATURE_A);

            return next();
        });
    });

    it('Update signature A', function (next) {
        SIGNATURE_A.patch({
            hash: SIGNATURE_A.hash + '2',
        }, function (err) {
            return next(err);
        });
    });

    it('Fetch signature A again', function (next) {
        Signature.get(SIGNATURE_A.hash, function (err, signature) {
            if (err) return next(err);
            expectSignature(signature, SIGNATURE_A);
            return next();
        });
    });

    it('Delete signature A', function (next) {
        SIGNATURE_A.del(function (err) {
            return next(err);
        });
    });

    it('Attempt to fetch signature A again', function (next) {
        Signature.get(SIGNATURE_A.hash, function (err, signature) {
            expect(signature).to.not.exist;  // i.e. null or undefined
            expect(err).to.be.an('object');
            expect(err).to.be.an.instanceOf(Error);
            return next();
        });
    });

    it('List signatures again', function (next) {
        Signature.getAll(function (err, signatures) {
            if (err) return next(err);

            // Like before, we just test that this array is now back to the
            // initial length, and *doesn't* contain signature A.
            expect(signatures).to.be.an('array');
            expect(signatures).to.have.length(INITIAL_SIGNATURES.length);
            expectSignaturesToNotContain(signatures, SIGNATURE_A);

            return next();
        });
    });
});
