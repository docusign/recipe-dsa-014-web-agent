// This is the /signing router. All url routing paths are relative to /signing

var express = require('express'),
    builder = require('xmlbuilder'),
    fs = require('fs'),
    uuid = require('node-uuid'),
    request = require('request'),
    PIXL = require('pixl-xml'),
    router = express.Router(),
    api_sendfile = "/Sign/UploadFileToSign",
    api_getfile = "/Sign/DownloadSignedFileG?sessionId=",
    api_ceremony = "/Sign/SignCeremony?sessionId=",
    path = require('path');

/* POST -- Create Signing request */
router.post('/', function(req, res, next) {
    var config = req.app.locals.configuration,
        filepath = path.join(__dirname, "../public/", config.doc1_file),
        fileID = uuid.v1(),
        request_xml_string,
        xml_obj = {},
        port = req.app.locals.port,
        // Finish url is the same as this method's, but GET will be used
        finish_url = req.protocol + '://' + req.hostname  + 
            ( port == 80 || port == 443 ? '' : ':'+port ) + config.finish_url_path;
            // from http://stackoverflow.com/a/12996059/64904
                    
    xml_obj.request = {};
    xml_obj.request.Document = {
        content: fs.readFileSync(filepath).toString('base64'),
        contentType: config.doc1_type,
        fileID: fileID,
        fileName: config.doc1_filename};
    xml_obj.request.Layout = {
        layoutMask: 16 + 128};
    xml_obj.request.Logic = {
        allowAdHoc: true,
        enforceReason: false,
        allowUserReason: true};
    xml_obj.request.Url = {
        finishURL: finish_url,
        redirectIFrame: false};
    request_xml_string = builder.create(xml_obj).end({ pretty: true});

    request.post({url: config.dsa_webagent_server + api_sendfile, form: {inputXML: request_xml_string}},
        function (error, response, body) {
            // This API uses a returnCode within an XML in the body. 200 is used even for app errors
            // So parse the XML then determine if there was an application error
            var response_xml, returnCode;
            if (!error && response.statusCode == 200) {
                response_xml = PIXL.parse( body );
                returnCode = response_xml.Error.returnCode;
            }
            
            // Now handle the different cases
            if (!error && response.statusCode == 200 && returnCode == 0) {
                // Desired case. Redirect to the DSA Web Agent
                res.redirect(config.dsa_webagent_server + api_ceremony + response_xml.Session.sessionId);
            } else if (!error && response.statusCode == 200 && returnCode != 0) {
                // Error from the DSA Web Agent
                req.flash('err', 'Error message from the Web Agent server: ' +
                    response_xml.Error.errorMessage + " (" + response_xml.Error.returnCode + ")" );
                res.redirect('/');
            } else {
                // Networking error
                var msg = body ? ("status: " + response.statusCode) :
                    ("network error: " + error.message);
                req.flash('err', 'Error contacting the Web Agent server: ' + msg);
                res.redirect('/');
            }
        }
    );
});
    

// The redirect back from the DSA Web Agent
// Eg /signing?sessionId=127709663&docId=c6f54520-ee08-11e5-a9aa-135e763244f1&returnCode=0
// Action: return a "Processing" page to the user. The processing page does an Ajax request on 
// signing/get_file?sessionId=127709663&docId=c6f54520-ee08-11e5-a9aa-135e763244f1&returnCode=0
// (Same query parameters that this method was called with)
router.get('/', function(req, res, next) {
    var qs = "sessionId=" + req.query.sessionId + "&docId=" + req.query.docId + 
                "&returnCode=" + req.query.returnCode
        config = req.app.locals.configuration,
        port = req.app.locals.port,
        url = req.protocol + '://' + req.hostname  + 
            ( port == 80 || port == 443 ? '' : ':'+port ) + config.finish_url_path +
            "/get_file?" + qs;
        // from http://stackoverflow.com/a/12996059/64904
    
    res.render('getting_file', { url: url });
});

// We have now been called, via Ajax, to interpret the response from the Web Agent and
// to download the file if the signing request was successful
router.get('/get_file', function(req, res, next) {
    var sessionId = req.query.sessionId,
        docId = req.query.docId,
        returnCode = req.query.returnCode,
        config = req.app.locals.configuration,
        filepath = path.join(__dirname, "../public/", "s" + docId),
        response_html,
        port = req.app.locals.port,
        document_url = req.protocol + '://' + req.hostname  + 
        ( port == 80 || port == 443 ? '' : ':'+port ) + "/s" + docId;
        // from http://stackoverflow.com/a/12996059/64904
        // Don't include public directory name itself.
    ;
        
    // Retrieving "state"
    // 1. Use the docId
    // 2. Use a cookie/session info
    // 3. Add a private query parameter to the finish_url that was provided to the Web Agent
        
    if (returnCode != 0) {
        response_html = "<h3>The signing request was not completed. <br/>" + 
            "Return Code = " + returnCode + ".</h3>";
        res.send(response_html);
        return; // EARLY return
    }
    
    // Successful signing! Retrieve the signed file
    request.get({url: config.dsa_webagent_server + api_getfile + sessionId},
        function (error, response, body) {
            // This API uses a returnCode within an XML in the body. 200 is used even for app errors
            // So parse the XML then determine if there was an application error
            var response_xml, returnCode;
            if (!error && response.statusCode == 200) {
                response_xml = PIXL.parse( body );
                returnCode = response_xml.Error.returnCode;
            }
            
            // Now handle the different cases
            if (!error && response.statusCode == 200 && returnCode == 0) {
                // File was signed and retrieved! Extract file and respond to the browser
                //
                // Add the signed file's content type to the file path. Remember that the 
                // file can change type during signing. Eg, an Excel document will be 
                // changed to a pdf only if it did not contain any signing fields.
                filepath += "." + response_xml.Document.contentType;
                document_url += "." + response_xml.Document.contentType;
                var buf = new Buffer(response_xml.Document.content, 'base64');
                fs.writeFileSync(filepath, buf, {encoding: null});
                response_html = "<h3>File was signed! <a href='" + document_url + "'>Download</a></h3>";
                res.send(response_html);
            } else if (!error && response.statusCode == 200 && returnCode != 0) {
                // Error from the DSA Web Agent
                response_html = "<h3>The Web Agent had a problem when we requested the signed file.<br/>" +
                    "Return Code = " + response_xml.Error.returnCode + ".</h3>";
                res.send(response_html);
            } else {
                // Networking error
                var msg = body ? ("status: " + response.statusCode) :
                    ("network error: " + error.message);
                response_html = "<h3>Error contacting the Web Agent server: " + msg + "</h3>";
                res.send(response_html);
            }
        }
    );
});

module.exports = router;
