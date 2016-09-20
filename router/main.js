// module.exports exposes functions that we want to use in a different file
//module.exports = function(app, con){
module.exports = function(app, client) {
    const config = require('config'),
        database = require("../lib/database.js"),
        authorization = require('../lib/authorization.js').authorization; // global variable for revision number
    let revision = config.revision; // default if database isn't working
    /*************************************************************************/
    // The following endpoints serve HTML pages
    /*************************************************************************/
    app.get('/', (req, res) => {
        database.getCachedData("revisionNumber", (err, data) => {
            if(!!err){
                console.error(err.reason);
            }
            revision = (!(!!err)) ? data.revision : revision;
            res.render('index.html', {
                revision
            });
        });
    });

    app.get('/about', (req, res) => {
        database.getCachedData("revisionNumber", (err, data) => {
            if(!!err){
                console.error(err.reason);
            }
            revision = (!(!!err)) ? data.revision : revision;
            res.render('about.html', {
                revision
            });
        });
    });

    app.get('/officers', (req, res) => {
        database.getCachedData(["revisionNumber", "officerList"], (err, data) => {
            if(!!err){
                console.error(err.reason);
            }
            revision = (!(!!err)) ? data.revisionNumber.revision : revision;
            var officerList = data && data.officerList || [];
            res.render('officers.ejs', {
                officerList,
                revision
            }); 
        });
    });

    app.get('/membership', (req, res) => {
        database.getCachedData(["revisionNumber", "jobs"], (err, data) => {
            const jobs = data.jobs.jobs,
                revisionNumber = data.revisionNumber.revision;
            if(!!err){
                console.error(err.reason);
            }
            revision = (!(!!err) && revisionNumber) ? revisionNumber : revision;
            res.render('membership.html', {
                revision: revision,
                jobList: jobs
            });
        });
    });

    app.get('/contact', (req, res) => {
        database.getCachedData(["revisionNumber", "mailchimp"], (err, data) => {
            if(!!err){
                console.error(err.reason);
            }
            const mailchimp = data.mailchimp.id,
                revisionNumber = data.revisionNumber.revision;
            revision = (!(!!err)) ? data.revision : revision;
            res.render('contact.html', {
                revision,
                mailchimp
            });
        });
    });

    /*************************************************************************/
    // WebConferenceController.js
    //
    // The following endpoints enable WebRTC connection capabilities with appear.in
    /*************************************************************************/
    app.use('/meeting',  require('../controllers/WebConferenceController.js'));

    /*************************************************************************/
    // AuthenticationController.js
    //
    // Authenticates officers if they want to post to the page
    /*************************************************************************/
    app.use('/authentication',  require('../controllers/AuthenticationController.js'));

    /*************************************************************************/
    // DataController.js
    //
    // The following endpoints send requests to the Redis database and send data to the frontend
    /*************************************************************************/
    app.use('/data',  require('../controllers/DataController.js'));

    /*************************************************************************/
    // UpdateController.js
    // 
    // The following endpoints POST data to the Redis database
    /*************************************************************************/
    app.use('/update',  require('../controllers/UpdateController.js'));

    /*************************************************************************/
    // CommunicationController.js
    //
    // The /contact endpoint sends e-mails from the form in the Contact Us page
    /*************************************************************************/
    app.use('/communication',  require('../controllers/CommunicationController.js'));

    /*************************************************************************/
    // If endpoint does not exist, render an error
    /*************************************************************************/

    app.get('*', (req, res)  => {
        database.getCachedData("revisionNumber", (err, data) => {
            if(!!err){
                console.error(err.reason);
            }
            revision = (!(!!err)) ? data.revision : revision;
            res.render('404.html', {
                revision
            });
        });
    });

} // end of module exports