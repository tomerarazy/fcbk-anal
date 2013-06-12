var users = {}; 
var images = {};
var friendsMap = {'Me' : 'Me'}
var groupsMap = {};
var groupCommentsMap = {};
var pagesMap = {}
var progressbar;
var progressLabel;
var uglyObject = {};
//var studentsGroupID  = 118649778226975;
var usersMap = {};
var postToOwnerMap = {}
var myId = 0;
var postLimit = 200;
var currentTime = parseInt(Date.now());
var trendMinutes = 4 * 60; // 
var trendMilliSeconds = trendMinutes * 60 * 1000;
var callbackCounter = 
{
    'users'     : 0,
    'paging'    : 0
}
// Utils

google.load('visualization', '1.0', {'packages':['corechart']});
google.setOnLoadCallback(function() {
    DebugPrint("Google Charts loaded successfully");
});
function DebugPrint(str) {
    if (typeof console === "undefined") {
        // FUCK IE
        return
    }
    console.log(str)
}

function ErrorPrint(str) {
    if (typeof console === "undefined") {
        // FUCK IE
        return
    }
    console.log('<' + Error.caller.name + '> Error: ' + str)
}

function JSONlength(obj) {
    var count = 0
    for (o in obj) {
        count++
    }
    return count
}

function getPagingStr(str) {
    return str.replace("https://graph.facebook.com","")
}

//

function get_facebook_album_id(url){
    var m = url.match(/\?set=a\.([0-9]*)\./);
    if (m == null) {
        return 0;
    }
    return m[1];
}

//Clear previous results
function clear_results() {
	clear_images('#photos2');
	$('#results').empty(); 
}

function clear_images(obj) {
	$(obj).empty(); 
}

function clear_selection() {
	DebugPrint('clear_selection()');
	$('.tagged_ppl').each(function() {
		this.checked=false;
	});
}

/*
	photos_hash = {
		<image_id> : {
			source : url,
			link : url,
			tagged : {
				<user_id> : 1
			}
		}
	}
*/
function display_photos(photos_hash,photos_obj) {
	for (var image_id in photos_hash) {
        var curr_image = photos_hash[image_id]
        display_photo(curr_image,image_id,photos_obj)
	}
}

function display_photo(curr_image,image_id,photos_obj) {
    var photo_div = '<div class="photo_div" id="image_'+image_id+'"></div>'
    $(photos_obj).append($(photo_div));
    var image_html = '<a href="' + curr_image.link + '" class="image_link">' + '<img src="' + curr_image.source + '" class="actual_image">' + '</a>'
    //var image_html = '<img src="'+photos_hash[image_id].source+'" class="actual_image">'
    $('#image_'+image_id).append($(image_html));
    var tagged_div = '<div class="tagged_div" id="tagged_'+image_id+'"></div>'
    $('#image_'+image_id).append($(tagged_div));
    for (var tagged_ids in curr_image.tagged) {
        var name = curr_image.tagged[tagged_ids]
        var link = users[tagged_ids].link;
        var ref_html = '<a href="'+link+'" class="image_tag">'+name+'</a>'
        $('#tagged_'+image_id).append($(ref_html));
    }
}

function load_photos_by(type) {
	clear_images('#photos2');	
	if (type == 'comments') {
		images.sort(function(img1,img2) {
			return (img2.total_comments - img1.total_comments);
		});
	} else if (type == 'likes') {
		images.sort(function(img1,img2) {			
            return (img2.total_likes - img1.total_likes);
		});
	} else {
		ErrorPrint('Invalid type');
		return;
	}
	var photos_hash = {}
	for (var i=0 ; i < 10 ; i++) {
		var id = images[i].id;
		photos_hash[id]={};
		photos_hash[id].source = images[i].source;
		photos_hash[id].link   = images[i].link;
		photos_hash[id].tagged={};
	}
	display_photos(photos_hash,'#photos2');
}

function getImageSummary(imageObject) {        
    FB.api(
        {
            method: 'fql.query',
            query : 'select like_info,comment_info from photo where object_id = ' + imageObject.id
        },
        function(response) {    
            if (response.error) {
                DebugPrint('<getImageSummary> Error - ' + response.error.message);
                return
            }
            //console.log(response[0]);
            imageObject['total_likes']      = response[0].like_info.like_count;
            imageObject['total_comments']   = response[0].comment_info.comment_count;
        }
    );
}

function load_photos() {
	var photos_hash = {};
	clear_images('#photos2');	
	$('.tagged_ppl').each(function() {
		if (!this.checked) { return }
		for (var image_id in users[this.id]['images']) {
			if (!photos_hash[image_id]) {
				photos_hash[image_id] = {}
				photos_hash[image_id].tagged = {}
			}
			photos_hash[image_id].source = users[this.id]['images'][image_id].source;
			photos_hash[image_id].link = users[this.id]['images'][image_id].link;
			photos_hash[image_id].tagged[this.id] = users[this.id].name;
			
		}
	});
	display_photos(photos_hash,'#photos2');
}


function update_results(users,total_users) {
	DebugPrint('Updating HTML');
    var count = 0
	for (user_id in users) {
		user = users[user_id]
		FB.api('/'+user_id,function(response) {
			if (response.error) {
				DebugPrint('<update_results> Error - ' + response.error.message);
                return
			}
			if (($('#filter_male').is(':checked') && response.gender == 'male') || 
                ($('#filter_female').is(':checked') && response.gender == 'female')) 
            {
                var html = '<input type="checkbox" class="tagged_ppl" id="'
                html += response.id + '" checked="true" /> <label for="'+response.id+'">' 
                html += response.name+'</label>';
				$('#results').append($(html));
				users[response.id].link = response.link;
			}
            count++
            var per = (count / total_users) * 100
            per = parseInt(per,10)
            progressbar.progressbar( "value", per );
            if (count == total_users) {
                $( "#progressbar" ).hide();                
            }
		});		
	}
    if (total_users == 0) {
        if (count == total_users) {
            $( "#progressbar" ).hide();                
        }
        $('#results').append($('<p>No tags were found in this album</p>'))
    }
}



function GetAllTagedUsers(album_id) {
	FB.api('/'+album_id+'?fields=name,count,id',function(response) {
		if (response.error) {
			DebugPrint('<GetAllTagedUsers> Error - ' + response.error.message);
			return
		}
		DebugPrint('------------------------------------');
		DebugPrint('Album Name : ' + response.name);
		DebugPrint('Total Photos : ' + response.count);
		getAllTagedUsersFromPhotos(response.id);
	});
}

function getAllTagedUsersFromPhotos(album_id) {
	users = {}
	images = {}
    
	FB.api('/'+album_id+'/photos?limit=500',function(response) {
		if (response.error) {
			DebugPrint('<getAllTagedUsersFromPhotos> Error - ' + response.error.message);
			return
		}                
		images = response.data;        
        var count = 0
		for (var j = 0; j < images.length; j++) {
            getImageSummary(images[j]);
			//DebugPrint('Name = '+ images[i].name + ' | ID = ' + albums[i].id);
			//DebugPrint(j);
			if (!images[j].tags) continue;
			var tags = images[j].tags.data;
			for (var i = 0; i < tags.length; i++) {	
				if (!tags[i].id) {continue} //Remove "fake" users (no id)
				if (!users[tags[i].id]) {
					users[tags[i].id] = {};
					users[tags[i].id]['name'] = tags[i].name;
					users[tags[i].id]['count'] = 1;
					users[tags[i].id]['images'] = {}
                    count++
				} else {
					users[tags[i].id].count++;
				}
				users[tags[i].id]['images'][images[j].id] = {};
				users[tags[i].id]['images'][images[j].id].source = images[j].source;
				users[tags[i].id]['images'][images[j].id].link = images[j].link;
			}            
		}
		DebugPrint('Finished parsing tags');
		/*
		for (user_id in users) {
			user = users[user_id]
			DebugPrint("Name: "+ user.name + ' | ID: ' + user_id + ' | Count: '+user.count);
		}
		*/
		update_results(users,count);
	});
}


 

function onLoadAlbum() {
    clear_results();
    var value = $('#album_url').val();
    if (value == "") { return }
    var album_id = get_facebook_album_id(value);
    if (album_id == 0) {
        DebugPrint("Invalid album ID")
        return;
    }
    GetAllTagedUsers(album_id);
    $('.after_load').show('fast')
    progressbar.progressbar({ value : false })
    $( "#progressbar" ).show()
}


function analyzePhotos() {
    clear_images('#photos1');    
    initCallbackCounter(showAnalysis);
    var name = $( "#friends_selection" ).val()
    if (typeof friendsMap[name] === "undefined") {
        ErrorPrint('Invalid friend name: ' + name);
    }
    var friendID = friendsMap[name]
    initUglyObject(name,friendID)
    progressbar.progressbar({ value : false })
    $( "#progressbar" ).show()
    var cmd = '/'+ friendID +'/photos?';
    getDataWithPaging(cmd,getImagesData,100,0);
}

function showAnalysis() {
    $( "#progressbar" ).hide()
    clear_images('#photos1');    
    var analysis_div = '<div id="analysis_div"></div>'
    photos_obj = "#photos1"
    $(photos_obj).empty()
    $(photos_obj).append($(analysis_div));
    if (JSONlength(uglyObject['images']) == 0) {
        $('#analysis_div').append($('<p>Error: the user has blocked applications from accessing his photos</p>'))
        $('#analysis_div').append($('<p>Remove him from your friends list</p>'))
        return
    }
    $('#analysis_div').append(
        $('<p>Number of photos analyzed: ' + JSONlength(uglyObject['images']) + '</p>'));    
        
    
    $('#analysis_div').append(
        $('<div id="likes_div"><p>Likes:</p></div>'));            
    $('#likes_div').append(
        $('<ul id="likes_ul"></ul>'));
    $('#likes_ul').append(
        $('<li>Total: ' + uglyObject.totals.likes.all + '</li>'));
    $('#likes_ul').append(
        $('<li>Males: ' + uglyObject.totals.likes.male + '</li>'));
    $('#likes_ul').append(
        $('<li>Females: ' + uglyObject.totals.likes.female + '</li>'));
            
    $('#analysis_div').append(
        $('<div id="comments_div"><p>Comments:</p></div>'));            
    $('#comments_div').append(
        $('<ul id="comments_ul"></ul>'));
    $('#comments_ul').append(
        $('<li>Total: ' + uglyObject.totals.comments.all + '</li>'));
    $('#comments_ul').append(
        $('<li>Males: ' + uglyObject.totals.comments.male + '</li>'));
    $('#comments_ul').append(
        $('<li>Females: ' + uglyObject.totals.comments.female + '</li>'));  
        
    var user = getUserWithMost(uglyObject.friends,'likes','male')
    $('#analysis_div').append(
        $('<p>Male user with most likes: ' + user.name + '(' + user.likes + ')</p>'));
    user = getUserWithMost(uglyObject.friends,'likes','female')
    $('#analysis_div').append(
        $('<p>Female user with most likes: ' + user.name + '(' + user.likes + ')</p>'));
    
    user = getUserWithMost(uglyObject.friends,'comments','male')
    $('#analysis_div').append(
        $('<p>Male user with most comments: ' + user.name + '(' + user.comments + ')</p>'));
    user = getUserWithMost(uglyObject.friends,'comments','female')
    $('#analysis_div').append(
        $('<p>Female user with most comments: ' + user.name + '(' + user.comments + ')</p>'));
        
    
        
    
    var image = getImageWithMost(uglyObject.images,'comments','all');
    $('#analysis_div').append(
        $('<p>Photo with most comments (' + image.comments.all + ')</p>'));
    display_photo(image,'p_c_a','#analysis_div')
    image = getImageWithMost(uglyObject.images,'comments','male');
    $('#analysis_div').append(
        $('<p>Photo with most comments by male users (' + image.comments.male + ')</p>'));
    display_photo(image,'p_c_m','#analysis_div')
    image = getImageWithMost(uglyObject.images,'comments','female');
    $('#analysis_div').append(
        $('<p>Photo with most comments by female users (' + image.comments.female + ')</p>'));
    display_photo(image,'p_c_f','#analysis_div')
    
   
    image = getImageWithMost(uglyObject.images,'likes','all');
    $('#analysis_div').append(
        $('<p>Photo with most likes (' + image.likes.all + ')</p>'));
    display_photo(image,'p_l_a','#analysis_div')
    image = getImageWithMost(uglyObject.images,'likes','male');
    $('#analysis_div').append(
        $('<p>Photo with most likes by male users (' + image.likes.male + ')</p>'));
    display_photo(image,'p_l_m','#analysis_div')
    image = getImageWithMost(uglyObject.images,'likes','female');
    $('#analysis_div').append(
        $('<p>Photo with most likes by female users (' + image.likes.female + ')</p>'));
    display_photo(image,'p_l_f','#analysis_div')
    
    
}

function objToArray(obj) {
    var result = []
    for (var key in obj) {
        result.push(obj[key])
    }
    return result;
}

function getImageWithMost(obj,type,gender) {
    var array = objToArray(obj)
    sortImages(array,type,gender);
    return array[0];
}

function sortImages(array,type,gender) {
    array.sort(function(obj1,obj2) {       
        return (obj2[type][gender] - obj1[type][gender]);
    });
}

function getUserWithMost(obj,type,gender) {
    var array = objToArray(obj)
    sortUsers(array,type);
    for (var idx in array) {
        if (array[idx].id != uglyObject.id && 
            (gender == "all" || array[idx].gender == gender )) {
            return array[idx];
        }
    }
}

function sortUsers(array,type) {
    array.sort(function(obj1,obj2) {       
        return (obj2[type] - obj1[type]);
    });
}


function getImagesData(image) {       
    initImageObject(image);
    var likesCmdStr = '/' + image.id + '/likes?' 
    getDataWithPaging(likesCmdStr,genTypeObjCallback(image.id,'likes'),100,0)
    var commentsCmdStr = '/' + image.id + '/comments?'
    getDataWithPaging(commentsCmdStr,genTypeObjCallback(image.id,'comments'),100,0)
}

function genTypeObjCallback(imageID,type) {
    return function(arrObj) {        
        var user_id = arrObj.id
        if (type == 'comments') {
            user_id = arrObj.from.id
        }
        uglyObject['images'][imageID][type].all++
        uglyObject['totals'][type].all++
        if (!uglyObject['friends'][user_id]) {
            var callbackFunc = genCreateUserCallback(imageID,type);
            callbackFunc(user_id)
        } else {            
            var gender = uglyObject['friends'][user_id].gender
            uglyObject['images'][imageID][type][gender]++
            uglyObject['friends'][user_id][type]++
            uglyObject['totals'][type][gender]++
        }
    }
} 





function genCreateUserCallback(imageID,type) {
     return function(user_id) {
        callbackCounter.paging++        
        FB.api('/' + user_id + '?fields=picture,gender,link,name',function(response) {
            if (response.error) {
                DebugPrint('<genCreateUserCallback> Error - ' + response.error.message);
                return
            }            
            // It's possible some other callback already created the user
            if (!uglyObject['friends'][user_id]) {
                initUserObject(response);
            }
            var gender = uglyObject['friends'][user_id].gender
            uglyObject['images'][imageID][type][gender]++
            uglyObject['friends'][user_id][type]++
            uglyObject['totals'][type][gender]++
            callbackCounter.paging--
            checkIfCallbackFinished();
        });
    }
}



function initCallbackCounter(onDone,onObjectDone) {
    callbackCounter = 
    {
        'users'   : 0,
        'paging'  : 0,
        'onDone'  : onDone,
        'onObjectDone' : onObjectDone,
    }
}

function checkIfCallbackFinished() {
    DebugPrint("users = " + callbackCounter.users + " | paging = " + callbackCounter.paging)
    if (callbackCounter.users == 0 && callbackCounter.paging == 0) {
        callbackCounter.onDone();
    }
}

function initUserObject(userObj) {        
    uglyObject['friends'][userObj.id] =
    {
        'id'        : userObj.id,
        'name'      : userObj.name,    
        'likes'     : 0,
        'comments'  : 0,
        'gender'    : userObj.gender,
        'link'      : userObj.link,
        'picture'   : userObj.picture.data.url
    }
}
  
function initImageObject(imgObj) {    
    var id = imgObj.id    
    uglyObject.images[id] = {}
    uglyObject.images[id]['tagged'] = {} // So I won't need to create a new "display_photo" function
    uglyObject.images[id]['id'] = id
    uglyObject.images[id]['source'] = imgObj.source
    uglyObject.images[id]['link'] = imgObj.link
    uglyObject.images[id]['likes'] = 
    {
        'all' : 0,
        'male' : 0,
        'female' : 0,
        'undefined' : 0
    }    
    uglyObject.images[id]['comments'] = 
    {
        'all' : 0,
        'male' : 0,
        'female' : 0,
        'undefined' : 0
    }
    DebugPrint(JSONlength(uglyObject.images))
    //display_photo(uglyObject.images[id],id,'#photos1')
}  
  
function getDataWithPaging(cmd,func,limit,offset) {
    callbackCounter.paging++
    console.log('Paging Count = ' + callbackCounter.paging);
    // Assume cmd contains '?'
    var apiCmd = cmd + '&offset=' + offset + '&limit=' + limit;
    FB.api(apiCmd,function(response) {
        if (response.error) {
            DebugPrint('<getPhotos> Error - ' + response.error.message);
            return
        }
        if (response.data.length == 0) {
            callbackCounter.paging--;
            console.log('Paging Count = ' + callbackCounter.paging);
            checkIfCallbackFinished();
            if (callbackCounter.onObjectDone) {
                    callbackCounter.onObjectDone();
            }
            return
        }        
        for (obj_idx in response.data) {
            func(response.data[obj_idx])
        }
    
        getDataWithPaging(cmd,func,limit,offset+limit);
        callbackCounter.paging--;
        console.log('Paging Count = ' + callbackCounter.paging);
        checkIfCallbackFinished();
    });
}
  

  
// -Init- stuff 

function initUglyObject(name,id) {
   uglyObject =  
   {
        'name'      : name,
        'id'        : id,
        'images'    : {},
        'friends'   : {},
        'totals' : 
        {
            'likes' : 
            {
                'all'       : 0,
                'male'      : 0,
                'female'    : 0,
                'undefined' : 0
            },
            'comments' : 
            {
                'all'       : 0,
                'male'      : 0,
                'female'    : 0,
                'undefined' : 0
            }
        }
    }
}

function initBasicDataBases(response) {
    initFriendsList(response);
    initGroupList();
    //initpageList();
}


function initpageList() {
    FB.api(
        {
            method: 'fql.query',
            query : 'select page_id, name from page where page_id in (select page_id from page_fan where uid = me()) limit 200',

        },
        function(response) {
            if (response.error) {
                DebugPrint('<initpageList> Error: ' + response.error.message);
                return
            }
            
            var availableTags = []
            for (page in response) {
                page = response[page]
                pagesMap[page.name] = page.page_id
                availableTags.push(page.name)
            }
            
            $( "#page_selection" ).autocomplete({
                source: availableTags
            });            
        }
    );
}

function initGroupList() {
    FB.api(
        {
            method: 'fql.query',
            query : 'select gid, name from group where gid in (select gid from group_member where uid = me()) limit 200',

        },
        function(response) {
            if (response.error) {
                DebugPrint('<initGroupList> Error: ' + response.error.message);
                return
            }
            
            var availableTags = []
                
            for (group in response) {
                group = response[group]
                groupsMap[group.name] = group.gid
                availableTags.push(group.name)
            }            
            $( "#group_selection" ).autocomplete({
                source: availableTags
            });            
        }
    );
}

// Limit??
function initFriendsList(loginResponse) {
    friendsMap['Me'] = loginResponse.authResponse.userID
    myId = loginResponse.authResponse.userID
    FB.api('/me/friends',function(response) {
		if (response.error) {
			DebugPrint('<initFriendsList> Error: ' + response.error.message);
			return
		}
        var availableTags = ['Me']
        
        for (friend in response.data) {
            friend = response.data[friend]
            friendsMap[friend.name] = friend.id
            availableTags.push(friend.name)
        }
        $( "#friends_selection" ).autocomplete({
            source: availableTags
        });
        $( "#friends_selection" ).val("Me")
    });
    

}

var postCount = 0;
function onPostOBjectDone() {
    postCount++;
    var per = (postCount / postLimit) * 100
    per = parseInt(per,10)
    //console.log("per: " + per);
    progressbar.progressbar( "value", per );
}

function genPostCommentCallback(postId) {
    return function(commentObj) {
        
        var ownerId = postToOwnerMap[postId].owner
        var commentOwnerId = commentObj.from.id
        groupCommentsMap[commentObj.id] = initTimeObj(commentObj.created_time);
        //console.log('comment owner id: ' + commentOwnerId);
        var commentOwnerName = commentObj.from.name
        usersMap[ownerId].commentsOn++
        postToOwnerMap[postId].comments++;
        if (typeof usersMap[commentOwnerId] == "undefined") {
            usersMap[commentOwnerId] = initGroupUserObject(commentOwnerName,commentOwnerId);
        }        
        usersMap[commentOwnerId].likes += commentObj.like_count;
        usersMap[commentOwnerId].commentsBy++;
    }
} 

/*
if (postToOwnerMap[postId].prevCommentTime != 0) {
            var timeDiffToNow = currentTime - commentTime;            
            if (timeDiffToNow <= trendMilliSeconds) {
                var timeDiffToPrev = commentTime - postToOwnerMap[postId].prevCommentTime;
                //console.log(timeDiffToPrev)
                var relToPrev = (1 - (timeDiffToPrev / trendMilliSeconds)) * 10;                            
                var relToNow = (timeDiffToNow / trendMilliSeconds) * 8;
                score = Math.exp(relToPrev) / Math.exp(relToNow)                            
                postToOwnerMap[postId].trendScore += (relToPrev + relToNow)
                
            }
        }
        postToOwnerMap[postId].prevCommentTime = commentTime;
*/

function initTimeObj(created_time) { 
    var d = new Date(created_time);
    return {
        hour : d.getHours() ,
        day : d.getDay() ,
        month : d.getMonth() ,
    };
}

function initArrayOfLength(len,value) {
    var arr = Array(len);
    for (var i = 0 ; i < len ; i++) {
        arr[i]=value;
    }
    return arr;
}

var weekdays = new Array(7);
weekdays[0] = "Sunday";
weekdays[1] = "Monday";
weekdays[2] = "Tuesday";
weekdays[3] = "Wednesday";
weekdays[4] = "Thursday";
weekdays[5] = "Friday";
weekdays[6] = "Saturday";

function genCommentsTimeResults() {
    var results = {
        days : initArrayOfLength(7,0),
        hours: initArrayOfLength(24,0),
        months : initArrayOfLength(12,0),
    }
    for (commentId in groupCommentsMap) {
        results.hours[groupCommentsMap[commentId].hour]++;
        results.days[groupCommentsMap[commentId].day]++;
        results.months[groupCommentsMap[commentId].month]++;        
    }
    console.log("this happen")
    return results;
}

function drawGroupCharts(results) {
    // Hours chart
    var hoursData = new google.visualization.DataTable();
    hoursData.addColumn('number', 'Hour');
    hoursData.addColumn('number', 'Comments');
    for (hour in results.hours) {
        hourCount = results.hours[hour]        
        hoursData.addRow([parseInt(hour),parseInt(hourCount)]);
    }        

        // Set chart options
    var hourOptions = {'title':'Number of comments in hours of the day',
                   'width':800,
                   'height':500,                   
                   };

        // Instantiate and draw our chart, passing in some options.
    var chart = new google.visualization.ColumnChart(document.getElementById('hours_chart_div'));
    chart.draw(hoursData, hourOptions);
    
    // Days chart
    var daysData = new google.visualization.DataTable();
    daysData.addColumn('string', 'Day');
    daysData.addColumn('number', 'Comments');
    for (day in results.days) {
        daysCount = results.days[day];
        dayStr = weekdays[day];
        daysData.addRow([dayStr,parseInt(daysCount)]);
    }        

        // Set chart options
    var daysOptions = {'title':'Number of comments in days of the week',
                   'width':800,
                   'height':500,                   
                   };

        // Instantiate and draw our chart, passing in some options.
    var chart = new google.visualization.ColumnChart(document.getElementById('days_chart_div'));
    chart.draw(daysData, daysOptions);
    
}


function isGroupNameValid() {
    var groupName = $( "#group_selection" ).val();
    if (groupName == "") {
        return 0
    }
    var groupId = groupsMap[groupName];
    console.log("groupId = " + groupId);
    if (typeof groupId == "undefined") {
        $("#invalid-group-error").show();
        $( "#invalid-group-error" ).dialog({
            modal: true,
            buttons: {
                Ok: function() {
                    $( this ).dialog( "close" );
                    $("#invalid-group-error").hide();
                }
            }
        });
        return 0;        
    }
    return groupId;
}


function loadGroupStats(groupId) {                        
    currentTime = parseInt(Date.now());
    usersMap = {};
    postToOwnerMap = {}
    progressbar.progressbar({ value : false });
    postCount = 0;        
    $( "#progressbar" ).show();
    initCallbackCounter(onShowGroupStatsFinish,onPostOBjectDone);
    FB.api('/'+ groupId + '/feed?fields=message,actions,from,likes,id,created_time&summary=true&limit='+postLimit,function(response) {
		if (response.error) {
			DebugPrint('<loadGroupStats> Error: ' + response.error.message);
			return
		}
        postLimit = response.data.length;
        //console.log(response.data.length)        
        for (postIdx in response.data) {        
            var post = response.data[postIdx]
            var postID = post.id
            var userName = post.from.name
            var userID = post.from.id
            postToOwnerMap[postID] = {}
            postToOwnerMap[postID].owner = userID      
            postToOwnerMap[postID].message = post.message;
            postToOwnerMap[postID].created_time = Date.parse(post.created_time);
            postToOwnerMap[postID].link = post.actions[0].link ; // probably need to check that
            var postLikes = post.likes ? post.likes.count : 0;
            postToOwnerMap[postID].likes = postLikes
            postToOwnerMap[postID].comments = 0
            if (typeof usersMap[userID] == "undefined") {
                usersMap[userID] = initGroupUserObject(userName,userID);
            }
            usersMap[userID].likes += postLikes;
            usersMap[userID].postsBy++;            
            var commentsCmdStr = '/' + postID + '/comments?fields=id,like_count,from,created_time'
            //console.log(commentsCmdStr)
            getDataWithPaging(commentsCmdStr,genPostCommentCallback(postID),50,0);            
            //
        }        
    });
}


function onShowGroupStatsFinish() {
    var commentsResults = genCommentsTimeResults();
    //Users               
    $( "#progressbar" ).hide();  
    $("#stats_results").show("fast");
    $('#general_results').append(
        $('<h class="stats_h">Users Stats</h>'));
    var arr = objToArray(usersMap).sort(function(obj1,obj2) {
        return obj2.likes - obj1.likes;
    });
     
    $('#general_results').append(
        $('<p>Most "liked" user: ' + arr[0].name + '(' + arr[0].likes + ')</p>'));
    
    arr = objToArray(usersMap).sort(function(obj1,obj2) {
        return (obj2.commentsBy + obj2.postsBy) - (obj1.commentsBy + obj1.postsBy);
    });
    $('#general_results').append(
        $('<p>User with most comments+posts: ' + arr[0].name + '(' + (parseInt(arr[0].commentsBy) + parseInt(arr[0].postsBy)) + ')</p>'));
    
    arr = objToArray(usersMap).sort(function(obj1,obj2) {
        return obj2.commentsOn - obj1.commentsOn;
    });
    
    $('#general_results').append(
        $('<p>User with most comments on his posts: ' + arr[0].name + '(' + arr[0].commentsOn + ')</p>'));
    
    //Posts
    $('#general_results').append(
        $('<h class="stats_h">Posts Stats</h>'));
    arr = objToArray(postToOwnerMap).sort(function(obj1,obj2) {
        return obj2.likes - obj1.likes;
    });    

    $('#general_results').append(
        $('<p>Most liked post (' + arr[0].likes + '):<br>' +        
                '<a href="' + arr[0].link + '">' + arr[0].message + '</a>' + '</p>'            
        ));
    
    arr = objToArray(postToOwnerMap).sort(function(obj1,obj2) {
        return obj2.comments - obj1.comments;
    });
    
    $('#general_results').append(
        $('<p>Most commented on post (' + arr[0].comments + '):<br>' +        
                '<a href="' + arr[0].link + '">' + arr[0].message + '</a>' + '</p>'            
        ));
    
    
    // My Stats
    if (typeof usersMap[myId] == "undefined") {
        return
    }
    $('#my_results').append(
        $('<h class="stats_h">' + usersMap[myId].name + ' Stats</h>'));
    
    $('#my_results').append(
        $('<p>Likes on my posts and comments: ' + usersMap[myId].likes + '</p>'));
        
    $('#my_results').append(
        $('<p>Comments on my posts: ' + usersMap[myId].commentsOn + '</p>'));
    
    $('#my_results').append(
        $('<p>Comments and Posts by me: ' + (parseInt(usersMap[myId].commentsBy) + parseInt(usersMap[myId].postsBy)) + '</p>'));
    
    
    var averageLikes = usersMap[myId].likes / (parseInt(usersMap[myId].commentsBy) + parseInt(usersMap[myId].postsBy));
    if (!isNaN(averageLikes)) {
        console.log('Average likes on my posts and comments: ' + averageLikes.toFixed(2));
        $('#my_results').append(
            $('<p>Average likes: ' + averageLikes.toFixed() + '</p>'));
    }
    var averageComments = usersMap[myId].commentsOn / usersMap[myId].postsBy
    if (!isNaN(averageComments)) {        
        $('#my_results').append(
            $('<p>Average comments on my posts: ' + averageComments.toFixed(2) + '</p>'));
    }
    drawGroupCharts(commentsResults);
}

function initGroupUserObject(name,id) {
    return  {
        id : id,
        name : name,
        likes : 0,
        commentsOn : 0,
        commentsBy : 0,
        postsBy : 0,
    };
};

function initProgressBar() {
    progressbar = $( "#progressbar" );
    progressLabel = $( ".progress-label" );
    progressbar.progressbar({
        value: false,
        change: function() {
            if (progressbar.progressbar("value") != false)
                progressLabel.text( progressbar.progressbar( "value" ) + "%" );
            else 
                progressLabel.text( "Loading..." );
        },
        complete: function() {
            progressLabel.text( "Complete!" );
        }
    });
    $( "#progressbar" ).hide()
}  

function FBlogin() {
	FB.login(function(response) {
		if (response.authResponse) {
			// connected
			DebugPrint("login::connected");
            initBasicDataBases(response);
		} else {
			// cancelled
			DebugPrint("cancelled");
		}
	},{scope: 'user_photos,friends_photos,user_groups,user_likes'});
}

function FBcancel() {
}


function openConfirmationDiaglog() {
    $( "#dialog-confirm" ).show();
    $( "#dialog-confirm" ).dialog({
        resizable: false,
        height: 190,
        modal: true,
        buttons: {
            "Open Login Dialog": function() {                
                $( this ).dialog( "close" );                
                FBlogin();
            },
            "Cancel": function() {
                $( this ).dialog( "close" );
                FBcancel();
            }
        }
    });
}


  
window.fbAsyncInit = function() {
	DebugPrint("fbAsyncInit");
	FB.init({
	  appId      : '462913707101218', // App ID			  
	  status     : true, // check login status
	  cookie     : true, // enable cookies to allow the server to access the session
	  xfbml      : true  // parse XFBML
	});

	FB.getLoginStatus(function(response) {
		if (response.status === 'connected') {
			// connected
			DebugPrint("getLoginStatus::connected");                        
            initBasicDataBases(response);
		} else if (response.status === 'not_authorized') {
			// not_authorized
			DebugPrint("not_authorized");
            openConfirmationDiaglog();
			//FBlogin();
		} else {
			// not_logged_in
			DebugPrint("not_logged_in");
			//FBlogin();
            openConfirmationDiaglog();
		}
	});
};
    

// Load the SDK Asynchronously  
(function(d){
	 var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
	 if (d.getElementById(id)) {return;}
	 js = d.createElement('script'); js.id = id; js.async = true;
	 js.src = "//connect.facebook.net/en_US/all.js";
	 ref.parentNode.insertBefore(js, ref);
}(document));


$(function() {
    $( "#dialog-confirm" ).hide();
    $( "#invalid-group-error").hide();
    $('.after_load').hide()
    $("#tabs").tabs()
    initProgressBar()    
    $('#analyze_photos').click(analyzePhotos)
    //$('#display_analysis').click(showAnalysis)
	$("#load_album").click(onLoadAlbum);
	$("#load_photos").click(load_photos);
    $("#stats_results").hide("fast");
    var spinner = $( "#spinner" ).spinner().spinner("value",postLimit);    
    
    $("#show_stats").click(function() {        
        var groupId = isGroupNameValid();
        if (groupId == 0) {
            return;
        }
        postLimit = $( "#spinner" ).spinner("value");
        $("#spinner_span").hide("slow");
        $("#group_selection_span").hide("slow");
        $(this).hide("slow");
        loadGroupStats(groupId);
    });
	$('#clear_selection').click(clear_selection);
	$('#top_ten').click(function() {
		var type = $('#top_ten_select').val();
		load_photos_by(type);
	});
});

// 596257623726912
//fql?q=SELECT pid,like_info,comment_info FROM photo WHERE album_object_id=596257623726912 LIMIT 1000
