`
 database.js

 Created by: Juan Cortez
 Date Created: August 22, 2016

 This file serves as a wrapper for any database client. The Database object
 is a Singleton that performs operations on the database through the following exposed
 functions. These functions all update the private cachedData variable so that unnecessary
 calls to the database client are prevented.

   create              :   Creates a Singleton Database Object with any generic database client
   getUUID             :   Gets a unique UUID of the Singleton Object
   cacheData           :   Caches data, as specified by a key, in a private cachedData variable inside the Database Object.
   setData             :   Sets data, as specified by a key, into the database client and in the cachedData private variable
   getAllCachedData    :   Returns all data stored inside the database
   getCachedData       :   Gets data, as specified by a key, from the cachedData private variable
   deleteData          :   Deletes data from the dabase client, as well as the cachedData private variable
   getKeys             :   Return the keys stored inside the database
   updateCache         :   Used to update cachedData after a change in the Database
`

const cfenv = require('cfenv'),
    appEnv = cfenv.getAppEnv(),
    isLocal = appEnv.isLocal;

const Database = (() => {
    const uuid = require('node-uuid'),
        exporter = require('../lib/exporter.js');
    let instance; // Instance stores a reference to the Singleton

    // Singleton
    function init(db) {
        const client = db,
            uniqueID = uuid.v4(); // give the Singleton a unique ID
        let cachedData = {};

        function _getKeys(callback){
            callback(false, Object.keys(cachedData));
        }

        function _cacheData(key = null, data = "", callback, optional = null) {
            if(!!optional) var {deleteKey, sendWebsiteRequest} = optional;

            if(!(!!key)){
                return callback({reason: "Key not provided!"});
            }

            if(!!deleteKey){
                delete cachedData[key];
                console.log(`Successfully deleted key, ${key}, from cache!`);
                return _sendWebsiteRequest(key, callback);
            }

        	if(data && typeof data === "string"){
        		console.log("Converting " + key + " data to an object");
                try{
                    data = JSON.parse(data);
                } catch(e){
                    return callback({reason: "Passed in JSON was not stringified JSON"});
                }
        	} 

            if(typeof data === "string") data = JSON.parse(data); // last check. not sure why not working in previous step

            if(typeof data === "object"){
                cachedData[key] = data;
                if(!!sendWebsiteRequest){
                    return _sendWebsiteRequest(key, callback);
                } 
                return callback(false);
            } else{
                return callback({reason: "Invalid type, must be JSON."});
            }
        }

        function _getAllCachedData(callback){
        	if(Object.keys(cachedData).length === 0 && cachedData.constructor === Object){
        		return callback({reason: "Cached data object is empty."});
        	}
        	callback(false, cachedData); 
        }

        function _getKeysCachedData(keys = [], callback){
            let response = {},
                length = keys.length;

            if(length === 0){
                return callback({reason: "Array of keys is 0, unable to fetch keys."});
            }

        	for(let i = 0; i < length; i++){
        		let currentKey = keys[i];
        		if(!(!!cachedData[currentKey])){
        			return callback({reason: `${currentKey} does not exist in cache. Request failed.`});
        		}
        		response[currentKey] =  cachedData[currentKey];
        	}
        	callback(false, response);
        }

        function _getCachedData(key = null, callback){
        	if(!(!!cachedData[key])){
        		return callback({reason: `${key} not found in cache`});
        	}
        	return callback(false, cachedData[key]);
        }

        function _setData(key = null, data = "", callback){
            if(!(!!key)){
                return callback({reason: "Key not provided!"});
            }

            if(typeof data === "string"){
                // Redis stores JSON as a String, so we need to stringify it
                try{
                    JSON.parse(data);
                } catch(e){
                    return callback({reason: "Passed in JSON was not stringified JSON"});
                }


                client.set(key, data, (err, response) => {
                    if(err){
                        return callback({reason: `Was not able to store  ${key} in Redis database.`});
                    }
                    console.log(`Successfully set database key, ${key}`);
                    return callback(null);
                }); 
            } else{
                return callback({reason: "Passed in JSON was not stringified JSON"});
            }
        }

        function _deleteData(key = null, callback){
            if(!(!!cachedData[key])){
                return callback({reason: `${key} does not exist in cache. Request failed.`});
            }

            _backupKey(key, (err) =>{
                if(!!err){
                    console.error(err.reason);
                }
                client.del(key, (err, reply) => {
                    if (err) {
                        return callback({reason: `Redis unable to remove ${key}`});
                    }
                    return _cacheData(key, null, callback, {
                        deleteKey: true, 
                        sendWebsiteRequest: true
                    });
                });
            });
        }

        function _backupKey(key = null, backupCallback){
            if(!(!!key)){
                return callback({reason: "Key not provided!"});
            }
            let backup = {};
                backup[key] = cachedData[key] || null;

            if(!!backup[key]){
                const path = require("path"),
                    destination = path.join(__dirname, `../metadata/backup/${key}_backup.json`);

                exporter.save.json({
                    destination,
                    filename: `${key}_backup.json`,
                    data: backup,
                    cb: (err, data) => {
                        if(err){
                            return backupCallback({reason: `Unable to backup ${key}. Request terminated.`});
                        }
                        backupCallback(false);
                    }
                });

            }
        };

        function _updateCache(key = null, callback){
            if(!(!!key)){
                return callback({reason: "Key not provided!"});
            }

            client.get(key, (err, data) => {
                if (err) {
                    return callback({reason: `Error: ${err}`});
                } else {
                    if (data == null) {
                        if(cachedData[key]){
                            delete cachedData[key];
                            return callback(false, `Successfully removed ${key} from cache!`);
                        }
                        return callback({reason: `${key} does not exist in cache and in the Redis database.`});
                    } else {
                        cachedData[key] = JSON.parse(data); // update cache from Redis database
                        return callback(false, `Successfully updated ${key} from cache!`);
                    }
                }
            });
        }

        // if any changes are made locally, make update available to Bluemix, since data is cached
        function _sendWebsiteRequest(key = null, callback){
            return;
            // if(isLocal) return callback(false);
            // const request = require("request");

            // console.log("Sending update to Bluemix website");

            // let options = { 
            //     method: 'POST',
            //     url: 'http://shpeaustin.mybluemix.net/update/cache',
            //     headers: { 
            //         'cache-control': 'no-cache',
            //         'content-type': 'application/json'
            //     },
            //     body: { 
            //         key: key 
            //     },
            //     json: true 
            // };

            // request(options, (error, response, body) => {
            //     if (error){
            //         return callback({reason: error});
            //     }
            //     console.log(`Successfully updated ${key} on Bluemix!`);
            //     return callback(false);
            // });
        }

        return {
            getUUID() {
                return uniqueID;
            },
            getClient(callback) {
                if(!(!!client)){
                    return callback({reason: "Client not defined! Not able to retrieved cached data!"});
                }
                return client;
            },
            getAllCachedData(callback) {
	        	if(!(!!client)){
	        		return callback({reason: "Client not defined! Not able to retrieved cached data!"});
	        	}
                _getAllCachedData(callback);
            },
            cacheData(key, data, callback){
	        	if(!(!!client)){
	        		return callback({reason: "Client not defined! Not able to cache data!"});
	        	}
            	_cacheData(key, data, callback);
            },
            getKeysCachedData(keys, callback){
	        	if(!(!!client)){
	        		return callback({reason: "Client not defined! Not able to retrieved cached data!"});
	        	}   
	        	_getKeysCachedData(keys, callback);   	
            },
            getCachedData(key, callback){
	        	if(!(!!client)){
	        		return callback({reason: "Client not defined! Not able to retrieved cached data!"});
	        	}
            	_getCachedData(key, callback);
            },
            setData(key, data, callback){
	        	if(!(!!client)){
	        		console.error({reason: "Client not defined! Not able to cache data!"});
	        		return;
	        	}
	        	_setData(key, data, callback);
            }, 
            deleteData(key, callback){
                if(!(!!client)){
                    console.error({reason: "Client not defined! Not able to cache data!"});
                    return;
                }
                _deleteData(key, callback);
            },
            getKeys(callback){
                if(!(!!client)){
                    console.error({reason: "Client not defined! Not able to view keys!"});
                    return;
                }
                _getKeys(callback);
            },
            updateCache(key, callback){
                if(!(!!client)){
                    console.error({reason: "Client not defined! Not able fetch from database!"});
                    return;
                }
                _updateCache(key, callback);
            }
        };
    };

    return {
        // Get the Singleton instance if one exists
        // or create one if it doesn't
        getInstance: (db) => {
            if (!instance) {
                instance = init(db);
            }
            return instance;
        }
    };
})();

`
    Creates a Singleton Database Object

    @params database{Object}       The database object, created by instantiating the Database client.

    @output callback{Function}      Signature for callback is function(err, data). 
                                    If err is truthy, it contains the property, err.reason, describing the error.

`
function create(db = null, cb) {
    _checkNumArguments(arguments, 2);
    // create a Singleton
    if (!(!!db)) {
        cb({reason: "Invalid Singleton parameters, must supply Database client!"});
        return;
    }
    const dbInstance = Database.getInstance(db);
    return cb(false, dbInstance);
}

`
    Gets a unique UUID of the Singleton Object
`
function getUUID() {
    return Database.getInstance().getUUID();
}

`
    Returns all data stored inside Redis database

    @output callback{Function}      Signature for callback is function(err, data). 
                                    If err is truthy, it contains the property, err.reason, describing the error.
                                    If data is truthy, it contains all data in database, as stringified JSON data

	database.getAllCachedData(function(err, data){
		if(!!err){
			console.error(err.reason);
			return;
		}
		console.log(JSON.stringify(data, null, 4));
	});
`
function getAllCachedData(callback) {
    _checkNumArguments(arguments, 1);
    Database.getInstance().getAllCachedData(callback);
}

`
    Caches data, as specified by a key, in a private cachedData variable inside the Database Object.

    @params key{String}             Key to be stored            
    @params data{String}            Stringified JSON            

    @output callback{Function}      Signature for callback is function(err). 
                                    If err is truthy, it contains the property, err.reason, describing the error.

    database.cacheData(key, data, function(err){
        if(!!err){
            console.error(err.reason);
            return;
        }
        console.log("Successully cached " + key + " data!");
    });
`
function cacheData(key = null, data = "", callback) {
    _checkNumArguments(arguments, 3);
    if(!(!!key) || !(!!data)){
        return callback({reason: "Key and/or data not provided"});
    }    
    var database = Database.getInstance();
    if (!database) {
        return console.error("AN ERRORRRR");
    }
    database.cacheData(key, data, callback);
}

`
    Gets data, as specified by a key, from the cachedData private variable

    @params key{String || Array}    Key(String) OR Keys(Array) to be retrieved
     
    @output callback{Function}      Signature for callback is function(err, data). 
                                    If err is truthy, it contains the property, err.reason, describing the error.
                                    If data is truthy, it contains the JSON stringified data, with the input key being the key to access the data

	For a Single Key:
	database.getCachedData(key, function(err, data){
	    if(!!err){
	        console.error(err.reason);
	        return;
	    }
	    console.log(data);
	});

	For an Array of Keys:
	database.getCachedData([key1, key2], function(err, data){
	    if(!!err){
	        console.error(err.reason);
	        return;
	    }
	    console.log(JSON.stringify(data, null, 4));
	});
`
function getCachedData(key = null, callback){
    _checkNumArguments(arguments, 2);
	var database = Database.getInstance();
    if(!(!!key)){
        return callback({reason: "Did not provide key"});
    }
	if(typeof key === "string"){
        if(!(!!key)){
            return callback({reason: "Did not provide key"});
        }
		database.getCachedData(key, callback);
	} else if(key instanceof Array){
        if(key.length === 0){
            return callback({reason: "Empty array."});
        }
		database.getKeysCachedData(key, callback);
	}
}

`
    Sets data, as specified by a key, into the Redis client and in the cachedData private variable

    @params key{String}             The key that is to be stored on the Redis database
    @params data{String}            The data associated with the key, sent in as stringified JSON
     
    @output callback{Function}      Signature for callback is function(err). 
                                    If err is truthy, it contains the property, err.reason, describing the error.

    database.setData(key, JSON.stringify(data), function(err){
        if(err){
            console.error("Error: " + err.reason);
            return;
        }
        console.log("Successully saved and cached " + key + " to Redis!");
    });
`
function setData(key = null, data = "", callback){
    _checkNumArguments(arguments, 3);
    var database = Database.getInstance();
    if(!(!!key) || !(!!data)){
        return callback({reason: "Key and/or data not provided"});
    }    
    database.setData(key, data, callback);
}

`
    Deletes data from the Redis client, as well as the cachedData private variable

    @params key{String}             The key that is to be removed from the Redis database
     
    @output callback{Function}      Signature for callback is function(err). 
                                    If err is truthy, it contains the property, err.reason, describing the error.

    database.deleteData(key, function(err){
        if(err){
            console.error("Error: " + err.reason);
            return;
        }
        console.log("Successfully removed " + key  + " from database!");
    });
`
function deleteData(key = null, callback){
    _checkNumArguments(arguments, 2);
    var database = Database.getInstance();
    if(!(!!key)){
        return callback({reason: "Key not provided"});
    }
    database.deleteData(key, callback);   
}

`
    Return the keys stored inside the Redis database

    @output callback{Function}      Signature for callback is function(err, keys). 
                                    If err is truthy, it contains the property, err.reason, describing the error.
                                    If keys is truthy, it contains an array of keys available in the Redis database

    database.getKeys(function(err, keys){
        if(err){
            console.error("Error: " + err.reason);
            return;
        }
        console.log("Successfully fetched keys in array format: " + keys);
    });
`
function getKeys(callback){
    _checkNumArguments(arguments, 1);
    var database = Database.getInstance();
    database.getKeys(callback);   
}

`
    Used to update cachedData after a change in the Database

    @params key{String}             The key that is to be updated from the Redis database after a database change has occurred. 

    @output callback{Function}      Signature for callback is function(err, response). 
                                    If err is truthy, it contains the property, err.reason, describing the error.
                                    If response is truthy, it contains a success message with the key that was updated

    database.updateCache(key, function(err, response){
        if(err){
            console.error("Error: " + err.reason);
            return;
        }
        console.log("Successfully updated local cache from Redis database.");
    });
`
function updateCache(key = null, callback){
    _checkNumArguments(arguments, 2);
    var database = Database.getInstance();
    database.updateCache(key, callback); 
}

`
    Checks that the number of arguments matches the number of expected arguments
`
function _checkNumArguments(args, expected){
    let numArgs = args.length || 0;

    if(numArgs !== expected){
        console.error(`Incorrect number of arguments! Expected ${expected} and got ${numArgs}. Request will hang and will ultimately fail.`);
    }
}

module.exports = {
    create,
    getUUID,
    cacheData,
    setData,
    getAllCachedData,
    getCachedData,
    deleteData,
    getKeys,
    updateCache
}