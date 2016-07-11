'use strict';

const neo4j = require('neo4j');
const process = require('process');
const errors = require('./errors');

const db = new neo4j.GraphDatabase({
    url: process.env['NEO4J_URL'] || process.env['GRAPHENEDB_URL'] ||
        'http://neo4j:neo4j@localhost:7474',
    auth: process.env['NEO4J_AUTH'],
});

// Private constructor:

const Signature = module.exports = function Signature(_node) {
    // All we'll really store is the node; the rest of our properties will be
    // derivable or just pass-through properties (see below).
    this._node = _node;
}

// Public constants:

Signature.VALIDATION_INFO = {
    'hash': {
        required: true,
        minLength: 2,
        maxLength: 16,
        pattern: /^[A-Za-z0-9_]+$/,
        message: '2-16 characters; letters, numbers, and underscores only.'
    },
};

// Public instance properties:

// The signature's hash, e.g. 'asdft65tghj'.
Object.defineProperty(Signature.prototype, 'hash', {
    get: function () { return this._node.properties['hash']; }
});

// Private helpers:

// Takes the given caller-provided properties, selects only known ones,
// validates them, and returns the known subset.
// By default, only validates properties that are present.
// (This allows `Signature.prototype.patch` to not require any.)
// You can pass `true` for `required` to validate that all required properties
// are present too. (Useful for `Signature.create`.)
function validate(props, required) {
    const safeProps = {};

    for (const prop in Signature.VALIDATION_INFO) {
        if (Signature.VALIDATION_INFO.hasOwnProperty(prop)) {
            const val = props[prop];
            validateProp(prop, val, required);
            safeProps[prop] = val;
        }
    }

    return safeProps;
}

// Validates the given property based on the validation info above.
// By default, ignores null/undefined/empty values, but you can pass `true` for
// the `required` param to enforce that any required properties are present.
function validateProp(prop, val, required) {
    const info = Signature.VALIDATION_INFO[prop];
    const message = info.message;

    if (!val) {
        if (info.required && required) {
            throw new errors.ValidationError(
                'Missing ' + prop + ' (required).');
        } else {
            return;
        }
    }

    if (info.minLength && val.length < info.minLength) {
        throw new errors.ValidationError(
            'Invalid ' + prop + ' (too short). Requirements: ' + message);
    }

    if (info.maxLength && val.length > info.maxLength) {
        throw new errors.ValidationError(
            'Invalid ' + prop + ' (too long). Requirements: ' + message);
    }

    if (info.pattern && !info.pattern.test(val)) {
        throw new errors.ValidationError(
            'Invalid ' + prop + ' (format). Requirements: ' + message);
    }
}

function isConstraintViolation(err) {
    return err instanceof neo4j.ClientError &&
        (err.neo4j.code === 'Neo.ClientError.Schema.ConstraintValidationFailed' || err.neo4j.code === 'Neo.ClientError.Schema.ConstraintViolation');
}

// Public instance methods:

// Atomically updates this signature, both locally and remotely in the db, with the
// given property updates.
Signature.prototype.patch = function (props, callback) {
    const safeProps = validate(props);

    const query = [
        'MATCH (signature:Signature {hash: {hash}})',
        'SET signature += {props}',
        'RETURN signature',
    ].join('\n');

    const params = {
        hash: this.hash,
        props: safeProps,
    };

    const self = this;

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (isConstraintViolation(err)) {
            // TODO: This assumes hash is the only relevant constraint.
            // We could parse the constraint property out of the error message,
            // but it'd be nicer if Neo4j returned this data semantically.
            // Alternately, we could tweak our query to explicitly check first
            // whether the hash is taken or not.
            err = new errors.ValidationError(
                'The hash ‘' + props.hash + '’ is taken.');
        }
        if (err) return callback(err);

        if (!results.length) {
            err = new Error('Signature has been deleted! Hash: ' + self.hash);
            return callback(err);
        }

        // Update our node with this updated+latest data from the server:
        self._node = results[0]['signature'];

        callback(null);
    });
};

Signature.prototype.del = function (callback) {
    // Use a Cypher query to delete both this signature and his/her following
    // relationships in one query and one network request:
    // (Note that this'll still fail if there are any relationships attached
    // of any other types, which is good because we don't expect any.)
    const query = [
        'MATCH (signature:Signature {hash: {hash}})',
        'OPTIONAL MATCH (signature) -[rel:follows]- (other)',
        'DELETE signature, rel',
    ].join('\n')

    const params = {
        hash: this.hash,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};

// Static methods:

Signature.get = function (hash, callback) {
    const query = [
        'MATCH (signature:Signature {hash: {hash}})',
        'RETURN signature',
    ].join('\n')

    const params = {
        hash: hash,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (err) return callback(err);
        if (!results.length) {
            err = new Error('No such signature with hash: ' + hash);
            return callback(err);
        }
        const signature = new Signature(results[0]['signature']);
        callback(null, signature);
    });
};

Signature.getAll = function (callback) {
    const query = [
        'MATCH (signature:Signature)',
        'RETURN signature',
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, results) {
        if (err) return callback(err);
        const signatures = results.map(function (result) {
            return new Signature(result['signature']);
        });
        callback(null, signatures);
    });
};

// Creates the signature and persists (saves) it to the db, incl. indexing it:
Signature.create = function (props, callback) {
    const query = [
        'CREATE (signature:Signature {props})',
        'RETURN signature',
    ].join('\n');

    const params = {
        props: validate(props)
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (isConstraintViolation(err)) {
            // TODO: This assumes hash is the only relevant constraint.
            // We could parse the constraint property out of the error message,
            // but it'd be nicer if Neo4j returned this data semantically.
            // Alternately, we could tweak our query to explicitly check first
            // whether the hash is taken or not.
            err = new errors.ValidationError(
                'The hash ‘' + props.hash + '’ is taken.');
        }
        if (err) return callback(err);
        const signature = new Signature(results[0]['signature']);
        callback(null, signature);
    });
};

// Static initialization:

// Register our unique hash constraint.
// TODO: This is done async'ly (fire and forget) here for simplicity,
// but this would be better as a formal schema migration script or similar.
db.createConstraint({
    label: 'Signature',
    property: 'hash',
}, function (err, constraint) {
    if (err) {
    	console.error('It looks like Neo4J is not running. Please start your Neo4J instance (e.g. `neo4j start`).');
    	process.exit(1);     // Failing fast for now, by crash the application.
    }
    if (constraint) {
        console.log('(Registered unique hashes constraint.)');
    } else {
        // Constraint already present; no need to log anything.
    }
})
