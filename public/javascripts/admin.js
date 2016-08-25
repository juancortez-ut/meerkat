$(document).ready(function() {
    $(".submit-request").click(function(evt) {
        var formElements = evt && evt.target && evt.target.form && evt.target.form.children || null,
            request = $(this).attr('data-request'),
            self = this,
            keys = [];

        if (!!formElements && formElements.length > 1) {
            var formArray = $.map(formElements, function(value, index) {
                if ($(value).is('.form-check')) {
                    return [value];
                }
                return; // don't add
            });

            var selectedItems = formArray.filter(function(form) {
                if ($(form).find(".form-check-input").is(":checked")) {
                    keys.push($(form).find(".form-check-input").val());
                    return true;
                }
                return false;
            });
        }
        var keysProcessed = 0;
        if (keys.length > 0 && request == "delete") {
            $(this).html('<i class="fa fa-cog fa-spin fa-3x fa-fw"></i>');
            keys.forEach(function(key) {
                $.ajax({
                    method: "DELETE",
                    url: "/data/" + key
                }).done(function(status) {
                    if (status === "OK") {
                        console.log(key + " was successfully cleared!");
                    }
                }).fail(function(e) {
                    console.error(key + " was unsuccessfully cleared.");
                    console.error(e);
                }).always(function() {
                    keysProcessed++;
                    if (keysProcessed == keys.length) {
                        complete(false, true);
                    }
                });
            });
        }

        if (request == "update") {
            $(this).html('<i class="fa fa-cog fa-spin fa-3x fa-fw"></i>');
            var radioValueUpdate = findSelectedRadio("updateoptions");

            if (radioValueUpdate == "newsletterdata") {
                var baseUrl = window.location.protocol + "//" + window.location.host + "/";
                window.open(baseUrl + "update/newsletterload");
                keysProcessed++;
                console.info("Don't forget to move the newsletter* images to public/assets/newsletter");
                if (keysProcessed == keys.length) {
                    complete(false, true);
                }
                return;
            }

            var data = $("#data-update").val(),
                type,
                error = false;

            try{
                var tmp = JSON.parse(data);
                type = typeof tmp;
            } catch(e){
                error = true;
            }

            data = (!!error && type !== "object") ? null : data;

            $.ajax({
                method: "PUT",
                url: "/data/" + radioValueUpdate,
                dataType: "json",
                contentType: "application/json",
                data: data
            }).done(function(status) {
                console.log(status);
                if (status === "OK") {
                    complete(false, false);
                    console.log(radioValueUpdate + " was successfully updated!");
                }
            }).fail(function(e) {
                if(e.status === 200){
                    complete(false, false);
                    return;
                }
                complete(true, false);
                console.error(radioValueUpdate + " was unsuccessfully updated.");
                console.error(e);
            }).always(function() {
            });
        }

        if (request == "view") {
            $(this).html('<i class="fa fa-cog fa-spin fa-3x fa-fw"></i>');
            var radioValue = findSelectedRadio("keyoptions");

            console.log(radioValue);
            $.ajax({
                method: "GET",
                url: "/data/" + radioValue
            }).done(function(data) {
                $(".json-container .output-container").show();
                $(".json-container .output-container i").show();
                $("#hidden-output").text(JSON.stringify(data));
                $(".output").text(JSON.stringify(data, null, 4));
                $('html, body').animate({
                    scrollTop: $(".json-container").offset().top - 90
                }, 1000);
                complete(false, false);
            }).fail(function(e) {
                complete(true, false);
                console.error("Unable to find " + radioValue + ". Error: " + JSON.stringify(e));
            }).always(function() {
            });
        }

        var outputJSON = function output(inp) {
            var jsonBlock = $(".output").append(document.createElement('pre'));
            jsonBlock.innerHTML = inp;
        };


        function complete(err, reload) {
            console.log("Request complete");
            $(self).html();

            if(!!err){
                $(self).text("Failure");
            } else{
                $(self).text("Success!");
            }

            setTimeout(function(){
                $(self).text("Submit");
            }, 2000);

            if (!!reload) {
                location.reload();
            }   

            return false;
        }

        function findSelectedRadio(name){
            var keys = document.getElementsByName(name);
            var key;
            for(var i = 0; i < keys.length; i++){
                if(keys[i].checked){
                    return keys[i].value;
                }
            }
        }
        return false;
    });

    $('input[type=radio][name=updateoptions]').change(function(evt) { 
        var radioChangeValue = evt.target.value;
        switch(radioChangeValue){
            case "calendar":
                $(".change-data").hide();
                $(".update-description").text("Will send a REST call to the Google Calendar API.");
                break;
            case "newsletterdata":
                $(".change-data").hide();
                $(".update-description").text("External call to newsletter page. Close new page when complete.");
                break;
            default:
                $(".update-description").text("");
                $(".change-data").show();
                break;
        }
    });

    // $("#copy-text").click(function(evt){
    //     debugger;
    //     var json = document.querySelector('.hidden-output');  
    //     var range = document.createRange();  
    //     range.selectNode(json);  
    //     window.getSelection().addRange(range); 
    //     try {  
    //         // Now that we've selected the anchor text, execute the copy command  
    //         var successful = document.execCommand('copy');  
    //         var msg = successful ? 'successful' : 'unsuccessful';  
    //         console.log('Copy email command was ' + msg);  
    //     } catch(err) {  
    //         console.log('Oops, unable to copy');  
    //     }  
    // });
document.getElementById("copy-text").addEventListener("click", function() {
    var success = copyToClipboard(document.getElementById("hidden-output"));
    $('html, body').animate({
        scrollTop: $(".json-container").offset().top - 90
    }, 1);
    var text = success ? "Successfully copied!" : "Copy unsuccessful!";
    var copyStatus = $(".copy-status");
    if(success){
        copyStatus.css({color: "green"});
    } else{
        copyStatus.css({color: "red"});
    }
    $(".copy-status").text(text).show();
    setTimeout(function(){
        copyStatus.hide();
    }, 2000);
});

function copyToClipboard(elem) {
      // create hidden text element, if it doesn't already exist
    var targetId = "_hiddenCopyText_",
        origSelectionStart, origSelectionEnd;
    var target = document.createElement("textarea");
    target.style.position = "absolute";
    target.style.left = "-9999px";
    target.style.top = "1200px";
    target.id = targetId;
    document.body.appendChild(target);

    target.textContent = elem.textContent;
    // select the content
    var currentFocus = document.activeElement;
    target.focus();
    target.setSelectionRange(0, target.value.length);
    
    // copy the selection
    var succeed;
    try {
          succeed = document.execCommand("copy");
    } catch(e) {
        succeed = false;
    }
    // restore original focus
    if (currentFocus && typeof currentFocus.focus === "function") {
        currentFocus.focus();
    }
    
    target.textContent = "";
    return succeed;
}
});