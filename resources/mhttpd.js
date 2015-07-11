/********************************************************************\
 
 Name:         mhttpd.js
 Created by:   Stefan Ritt
 
 Contents:     JavaScript midas library used by mhttpd
 
\********************************************************************/

// MIDAS type definitions
var TID_BYTE = 1;
var TID_SBYTE = 2;
var TID_CHAR = 3;
var TID_WORD = 4;
var TID_SHORT = 5;
var TID_DWORD = 6;
var TID_INT = 7;
var TID_BOOL = 8;
var TID_FLOAT = 9;
var TID_DOUBLE = 10;
var TID_BITFIELD = 11;
var TID_STRING = 12;
var TID_ARRAY = 13;
var TID_STRUCT = 14;
var TID_KEY = 15;
var TID_LINK = 16;

function XMLHttpRequestGeneric()
{
   var request;
   try {
      request = new XMLHttpRequest(); // Firefox, Opera 8.0+, Safari
   }
   catch (e) {
      try {
         request = new ActiveXObject('Msxml2.XMLHTTP'); // Internet Explorer
      }
      catch (e) {
         try {
            request = new ActiveXObject('Microsoft.XMLHTTP');
         }
         catch (e) {
           alert('Your browser does not support AJAX!');
           return undefined;
         }
      }
   }

   return request;
}

var ODBUrlBase = "";

function ODBSetURL(url)
{
    ODBUrlBase = url;
}

function ODBSet(path, value, pwdname)
{
   var value, request, url;

   if (pwdname != undefined)
      pwd = prompt('Please enter password', '');
   else
      pwd = '';

   var request = XMLHttpRequestGeneric();

   url = ODBUrlBase + '?cmd=jset&odb=' + path + '&value=' + encodeURIComponent(value);

   if (pwdname != undefined)
      url += '&pnam=' + pwdname;

   request.open('GET', url, false);

   if (pwdname != undefined)
      request.setRequestHeader('Cookie', 'cpwd='+pwd);

   request.send(null);

   if (request.status != 200 || request.responseText != 'OK') 
      alert('ODBSet error:\nPath: '+path+'\nHTTP Status: '+request.status+'\nMessage: '+request.responseText+'\n'+document.location) ;
}

function ODBGet(path, format, defval, len, type)
{
   var request = XMLHttpRequestGeneric();

   var url = ODBUrlBase + '?cmd=jget&odb=' + path;
   if (format != undefined && format != '')
      url += '&format=' + format;
   request.open('GET', url, false);
   request.send(null);

   if (path.match(/[*]/)) {
      if (request.responseText == null)
         return null;
      if (request.responseText == '<DB_NO_KEY>') {
         url = '?cmd=jset&odb=' + path + '&value=' + defval + '&len=' + len + '&type=' + type;

         request.open('GET', url, false);
         request.send(null);
         return defval;
      } else {
         var array = request.responseText.split('\n');
         return array;
      }
   } else {
      if ((request.responseText == '<DB_NO_KEY>' ||
           request.responseText == '<DB_OUT_OF_RANGE>') && defval != undefined) {
         url = '?cmd=jset&odb=' + path + '&value=' + defval + '&len=' + len + '&type=' + type;

         request.open('GET', url, false);
         request.send(null);
         return defval;
      }
      return request.responseText.split('\n')[0];
   }
}

function ODBMGet(paths, callback, formats)
{
   var request = XMLHttpRequestGeneric();

   var url = ODBUrlBase + '?cmd=jget';
   for (var i=0 ; i<paths.length ; i++) {
      url += '&odb'+i+'='+paths[i];
      if (formats != undefined && formats != '')
         url += '&format'+i+'=' + formats[i];
   }

   if (callback != undefined) {
      request.onreadystatechange = function() 
         {
         if (request.readyState == 4) {
            if (request.status == 200) {
               var array = request.responseText.split('$#----#$\n');
               for (var i=0 ; i<array.length ; i++)
                  if (paths[i].match(/[*]/)) {
                     array[i] = array[i].split('\n');
                     array[i].length--;
                  } else
                     array[i] = array[i].split('\n')[0];
               callback(array);
            }
         }
      }
      request.open('GET', url, true);
   } else
      request.open('GET', url, false);
   request.send(null);

   if (callback == undefined) {
      var array = request.responseText.split('$#----#$\n');
      for (var i=0 ; i<array.length ; i++) {
         if (paths[i].match(/[*]/)) {
            array[i] = array[i].split('\n');
            array[i].length--;
         } else
            array[i] = array[i].split('\n')[0];
      }
      return array;
   }
}

function ODBGetRecord(path)
{
   var request = XMLHttpRequestGeneric();

   var url = ODBUrlBase + '?cmd=jget&odb=' + path + '&name=1';
   request.open('GET', url, false);
   request.send(null);
   return request.responseText;
}

function ODBExtractRecord(record, key)
{
   var array = record.split('\n');
   for (var i=0 ; i<array.length ; i++) {
      var ind = array[i].indexOf(':');
      if (ind > 0) {
         var k = array[i].substr(0, ind);
         if (k == key)
            return array[i].substr(ind+1, array[i].length);
      }
      var ind = array[i].indexOf('[');
      if (ind > 0) {
         var k = array[i].substr(0, ind);
         if (k == key) {
            var a = new Array();
            for (var j=0 ; ; j++,i++) {
               if (array[i].substr(0, ind) != key)
                  break;
               var k = array[i].indexOf(':');
               a[j] = array[i].substr(k+1, array[i].length);
            }
            return a;
         }
      }
   }
   return null;
}

function ODBKey(path)
{
   var request = XMLHttpRequestGeneric();

   var url = ODBUrlBase + '?cmd=jkey&odb=' + path;
   request.open('GET', url, false);
   request.send(null);
   if (request.responseText == null)
      return null;
   var res = request.responseText.split('\n');
   this.name = res[0];
   this.type = res[1];
   this.num_values = res[2];
   this.item_size = res[3];
   this.last_written = res[4];
}

function ODBCopy(path, format)
{
   var request = XMLHttpRequestGeneric();

   var url = ODBUrlBase + '?cmd=jcopy&odb=' + path;
   if (format != undefined && format != '')
      url += '&format=' + format;
   request.open('GET', url, false);
   request.send(null);
   return request.responseText;
}

function ODBCall(url, callback)
{
   var request = XMLHttpRequestGeneric();
      
   if (callback != undefined) {
      request.onreadystatechange = function() 
         {
            if (request.readyState == 4) {
               if (request.status == 200) {
                  callback(request.responseText);
               }
            }
         }
      request.open('GET', url, true);
      request.send(null);
      return;
   }
   
   request.open('GET', url, false);
   request.send(null);
   return request.responseText;
}

function ODBMCopy(paths, callback, encoding)
{
   var url = ODBUrlBase + '?cmd=jcopy';
   for (var i=0 ; i<paths.length ; i++) {
      url += '&odb'+i+'='+encodeURIComponent(paths[i]);
   }

   if (encoding != undefined && encoding != '')
      url += '&encoding=' + encodeURIComponent(encoding);

   return ODBCall(url, callback);
}

function ODBMLs(paths, callback)
{
   var url = ODBUrlBase + '?cmd=jcopy&encoding=json-norecurse';
   for (var i=0 ; i<paths.length ; i++) {
      url += '&odb'+i+'='+encodeURIComponent(paths[i]);
   }

   return ODBCall(url, callback);
}

function ODBMCreate(paths, types, arraylengths, stringlengths, callback)
{
   var url = ODBUrlBase + '?cmd=jcreate';
   for (var i=0 ; i<paths.length ; i++) {
      url += '&odb'+i+'='+encodeURIComponent(paths[i]);
      url += '&type'+i+'='+encodeURIComponent(types[i]);
      if (arraylengths != undefined) {
         url += '&arraylen'+i+'='+encodeURIComponent(arraylengths[i]);
      }
      if (stringlengths != undefined) {
         url += '&strlen'+i+'='+encodeURIComponent(stringlengths[i]);
      }
   }
   return ODBCall(url, callback);
}

function ODBMResize(paths, arraylengths, stringlengths, callback)
{
   var url = ODBUrlBase + '?cmd=jresize';
   for (var i=0 ; i<paths.length ; i++) {
      url += '&odb'+i+'='+encodeURIComponent(paths[i]);
      url += '&arraylen'+i+'='+encodeURIComponent(arraylengths[i]);
      url += '&strlen'+i+'='+encodeURIComponent(stringlengths[i]);
   }
   return ODBCall(url, callback);
}

function ODBMRename(paths, names, callback)
{
   var url = ODBUrlBase + '?cmd=jrename';
   for (var i=0 ; i<paths.length ; i++) {
      url += '&odb'+i+'='+encodeURIComponent(paths[i]);
      url += '&name'+i+'='+encodeURIComponent(names[i]);
   }
   return ODBCall(url, callback);
}

function ODBMLink(paths, links, callback)
{
   var url = ODBUrlBase + '?cmd=jlink';
   for (var i=0 ; i<paths.length ; i++) {
      url += '&dest'+i+'='+encodeURIComponent(paths[i]);
      url += '&odb'+i+'='+encodeURIComponent(links[i]);
   }
   return ODBCall(url, callback);
}

function ODBMReorder(paths, indices, callback)
{
   var url = ODBUrlBase + '?cmd=jreorder';
   for (var i=0 ; i<paths.length ; i++) {
      url += '&odb'+i+'='+encodeURIComponent(paths[i]);
      url += '&index'+i+'='+encodeURIComponent(indices[i]);
   }
   return ODBCall(url, callback);
}

function ODBMKey(paths, callback)
{
   var url = ODBUrlBase + '?cmd=jkey&encoding=json';
   for (var i=0 ; i<paths.length ; i++) {
      url += '&odb'+i+'='+encodeURIComponent(paths[i]);
   }
   return ODBCall(url, callback);
}

function ODBMDelete(paths, callback)
{
   var url = ODBUrlBase + '?cmd=jdelete';
   for (var i=0 ; i<paths.length ; i++) {
      url += '&odb'+i+'='+encodeURIComponent(paths[i]);
   }
   return ODBCall(url, callback);
}

function ODBRpc_rev0(name, rpc, args)
{
   var request = XMLHttpRequestGeneric();

   var url = ODBUrlBase +  '?cmd=jrpc_rev0&name=' + name + '&rpc=' + rpc;
   for (var i = 2; i < arguments.length; i++) {
     url += '&arg'+(i-2)+'='+arguments[i];
   };
   request.open('GET', url, false);
   request.send(null);
   if (request.responseText == null)
      return null;
   this.reply = request.responseText.split('\n');
}

function ODBRpc_rev1(name, rpc, max_reply_length, args)
{
   var request = XMLHttpRequestGeneric();

   var url = ODBUrlBase + '?cmd=jrpc_rev1&name=' + name + '&rpc=' + rpc + '&max_reply_length=' + max_reply_length;
   for (var i = 3; i < arguments.length; i++) {
     url += '&arg'+(i-3)+'='+arguments[i];
   };
   request.open('GET', url, false);
   request.send(null);
   if (request.responseText == null)
      return null;
   return request.responseText;
}

function ODBRpc(program_name, command_name, arguments_string, callback, max_reply_length)
{
   var url = ODBUrlBase + '?cmd=jrpc';
   url += '&name=' + encodeURIComponent(program_name);
   url += '&rcmd=' + encodeURIComponent(command_name);
   url += '&rarg=' + encodeURIComponent(arguments_string);
   if (max_reply_length) {
      url += '&max_reply_length=' + encodeURIComponent(max_reply_length);
   }
   return ODBCall(url, callback);
}

function ODBGetMsg(facility, start, n)
{
   var request = XMLHttpRequestGeneric();

   var url = ODBUrlBase + '?cmd=jmsg&f='+facility+'&t=' + start+'&n=' + n;
   request.open('GET', url, false);
   request.send(null);

   if (n > 1 || n == 0) {
      var array = request.responseText.split('\n');
      while (array.length > 1 && array[array.length-1] == "")
         array = array.slice(0, array.length-1);
      return array;
   } else
      return request.responseText;
}

function ODBGenerateMsg(m)
{
   var request = XMLHttpRequestGeneric();

   var url = ODBUrlBase + '?cmd=jgenmsg&msg=' + m;
   request.open('GET', url, false);
   request.send(null);
   return request.responseText;
}

function ODBGetAlarms()
{
   var request = XMLHttpRequestGeneric();
   request.open('GET', ODBUrlBase + '?cmd=jalm', false);
   request.send(null);
   var a = request.responseText.split('\n');
   a.length = a.length-1;
   return a;
}

function ODBEdit(path)
{
   var value = ODBGet(encodeURIComponent(path));
   var new_value = prompt('Please enter new value', value);
   if (new_value != undefined) {
      ODBSet(encodeURIComponent(path), new_value);
      window.location.reload();
   }
}

function ODBFinishInlineEdit(p, path, bracket)
{
   var value;
 
   if (p.ODBsent == true)
      return;
   
   if (p.childNodes.length == 2)
      value = p.childNodes[1].value;
   else
      value = p.childNodes[0].value;

   ODBSet(encodeURIComponent(path), value);
   p.ODBsent = true;
   
   var link = document.createElement('a');
   if (value == "")
      value = "(empty)";
   link.innerHTML = value;
   link.href = path+"?cmd=Set";
   link.onclick = function(){ODBInlineEdit(p,path,bracket);return false;};
   link.onfocus = function(){ODBInlineEdit(p,path,bracket);};
   
   if (p.childNodes.length == 2)
      setTimeout(function(){p.appendChild(link);p.removeChild(p.childNodes[1])}, 10);
   else
      setTimeout(function(){p.appendChild(link);p.removeChild(p.childNodes[0])}, 10);
}

function ODBInlineEditKeydown(event, p, path, bracket)
{
   var keyCode = ('which' in event) ? event.which : event.keyCode;
   
   if (keyCode == 27) {
      /* cancel editing */
      p.ODBsent = true;

      var value = ODBGet(encodeURIComponent(path));
      var link = document.createElement('a');
      if (value == "")
         value = "(empty)";
      link.innerHTML = value;
      link.href = path+"?cmd=Set";
      link.onclick = function(){ODBInlineEdit(p,path,bracket);return false;};
      link.onfocus = function(){ODBInlineEdit(p,path,bracket);};
      
      if (p.childNodes.length == 2)
         setTimeout(function(){p.appendChild(link);p.removeChild(p.childNodes[1])}, 10);
      else
         setTimeout(function(){p.appendChild(link);p.removeChild(p.childNodes[0])}, 10);
   
      return false;
   }

   if (keyCode == 13) {
      ODBFinishInlineEdit(p, path, bracket);
      return false;
   }

   return true;
}

function ODBInlineEdit(p, odb_path, bracket)
{
   var cur_val = ODBGet(encodeURIComponent(odb_path));
   var size = cur_val.length+10;
   var index;
   
   p.ODBsent = false;
   var str = cur_val;
   while (str.indexOf('"') >= 0)
      str = str.replace('"', '&quot;');

   if (odb_path.indexOf('[') > 0) {
      index = odb_path.substr(odb_path.indexOf('['));
      if (bracket == 0) {
         p.innerHTML = "<input type=\"text\" size=\""+size+"\" value=\""+str+"\" onKeydown=\"return ODBInlineEditKeydown(event, this.parentNode,\'"+odb_path+"\',"+bracket+");\" onBlur=\"ODBFinishInlineEdit(this.parentNode,\'"+odb_path+"\',"+bracket+");\" >";
         setTimeout(function(){p.childNodes[0].focus();p.childNodes[0].select();}, 10); // needed for Firefox
      } else {
         p.innerHTML = index+"&nbsp;<input type=\"text\" size=\""+size+"\" value=\""+str+"\" onKeydown=\"return ODBInlineEditKeydown(event, this.parentNode,\'"+odb_path+"\',"+breacket+");\" onBlur=\"ODBFinishInlineEdit(this.parentNode,\'"+odb_path+"\',"+breacket+");\" >";
         setTimeout(function(){p.childNodes[1].focus();p.childNodes[1].select();}, 10); // needed for Firefox
      }
   } else {
      
      p.innerHTML = "<input type=\"text\" size=\""+size+"\" value=\""+str+"\" onKeydown=\"return ODBInlineEditKeydown(event, this.parentNode,\'"+odb_path+"\',"+bracket+");\" onBlur=\"ODBFinishInlineEdit(this.parentNode,\'"+odb_path+"\',"+bracket+");\" >";

      setTimeout(function(){p.childNodes[0].focus();p.childNodes[0].select();}, 10); // needed for Firefox
   }
}

function mhttpd_create_page_handle_create(mouseEvent)
{
   var form = document.getElementsByTagName('form')[0];
   var path = form.elements['odb'].value;
   var type = form.elements['type'].value;
   var name = form.elements['value'].value;
   var arraylength = form.elements['index'].value;
   var stringlength = form.elements['strlen'].value;

   if (path == "/") path = "";

   if (name.length < 1) {
      alert("Name is too short");
      return false;
   }

   if (arraylength < 1) {
      alert("Bad array length: " + arraylength);
      return false;
   }

   if (stringlength < 1) {
      alert("Bad string length " + stringlength);
      return false;
   }

   var result = JSON.parse(ODBMCreate([ path + "/" + name ], [ type ], [ arraylength ], [ stringlength ]));

   if (result[0] == 311) {
      alert("ODB entry with this name already exists.");
   } else if (result[0] != 1) {
      alert("ODBMCreate() error " + result + ", and that's all we know.");
   } else {
      location.search = ""; // reloads the document
   }
   //window.reload();
   return false;
}

function mhttpd_create_page_handle_cancel(mouseEvent)
{
   location.search = ""; // reloads the document
   return false;
}

function mhttpd_delete_page_handle_delete(mouseEvent)
{
   var form = document.getElementsByTagName('form')[0];
   var path = form.elements['odb'].value;

   if (path == "/") path = "";

   var names = [];
   for (var i=0; ; i++) {
      var n = "name" + i;
      var v = form.elements[n];
      if (v == undefined) break;
      if (v == undefined) break;
      if (v.checked)
         names.push(path + "/" + v.value);
   }

   if (names.length < 1) {
      alert("Please select at least one ODB entry to delete.");
      return false;
   }

   //alert(names);

   var result = JSON.parse(ODBMDelete(names));

   location.search = ""; // reloads the document

   //window.reload();
   return false;
}

function mhttpd_delete_page_handle_cancel(mouseEvent)
{
   location.search = ""; // reloads the document
   return false;
}

var facility;
var first_tstamp = 0;
var last_tstamp = 0;
var end_of_messages = false;
var n_messages = 0;

function msg_append(msg)
{
   var mf = document.getElementById('messageFrame');
   
   for(i=0 ; i<msg.length ; i++) {
      var line = msg[i];
      var t = parseInt(line);
      
      if (t != -1 && t > first_tstamp)
         first_tstamp = t;
      if (t != -1 && (last_tstamp == 0 || t < last_tstamp))
         last_tstamp = t;
      if (line.indexOf(" ") && parseInt(line)>0)
         line = line.substr(line.indexOf(" "));
      var e = document.createElement("p");
      e.appendChild(document.createTextNode(line));
      if (line.search("ERROR]") > 0) {
         e.style.backgroundColor = "red";
         e.style.color = "white";
      }

      mf.appendChild(e);
      n_messages++;
   }
}

function msg_prepend(msg)
{
   var mf = document.getElementById('messageFrame');
   
   for(i=0 ; i<msg.length ; i++) {
      var line = msg[i];
      var t = parseInt(line);
      
      if (line.indexOf(" ") && parseInt(line)>0)
         line = line.substr(line.indexOf(" "));
      var e = document.createElement("p");
      e.appendChild(document.createTextNode(line));

      if (e.innerHTML == mf.childNodes[2+i].innerHTML)
         break;
      mf.insertBefore(e, mf.childNodes[2+i]);
      first_tstamp = t;
      n_messages++;

      if (line.search("ERROR]") > 0) {
         e.style.backgroundColor = "red";
         e.style.color = "white";
      } else {
         e.style.backgroundColor = "yellow";
         e.age = new Date()/1000;
         e.style.setProperty("-webkit-transition", "background-color 3s");
         e.style.setProperty("transition", "background-color 3s");
      }
   
   }
}

function msg_load(f)
{
   facility = f;
   var msg = ODBGetMsg(facility, 0, 100);
   msg_append(msg);
   if (isNaN(last_tstamp))
      end_of_messages = true;
   
   // set message window height to fit browser window
   mf = document.getElementById('messageFrame');
   mf.style.height = window.innerHeight-findPos(mf)[1]-4;
  
   // check for new messages and end of scroll
   window.setTimeout(msg_extend, 1000);
}

function findPos(obj) {
   var curleft = curtop = 0;
   if (obj.offsetParent) {
      do {
         curleft += obj.offsetLeft;
         curtop += obj.offsetTop;
         } while (obj = obj.offsetParent);
      return [curleft,curtop];
   }
}

function msg_extend()
{
   // set message window height to fit browser window
   mf = document.getElementById('messageFrame');
   mf.style.height = window.innerHeight-findPos(mf)[1]-4;

   // if scroll bar is close to end, append messages
   if (mf.scrollHeight-mf.scrollTop-mf.clientHeight < 2000) {
      if (!end_of_messages) {
         
         if (last_tstamp > 0) {
            var msg = ODBGetMsg(facility, last_tstamp-1, 100);
            if (msg[0] == "")
               end_of_messages = true;
            if (!end_of_messages) {
               msg_append(msg);
            }
         } else {
            // in non-timestamped mode, simple load full message list
            var msg = ODBGetMsg(facility, 0, n_messages+100);
            n_messages = 0;

            var mf = document.getElementById('messageFrame');
            for (i=mf.childNodes.length-1 ; i>1 ; i--)
               mf.removeChild(mf.childNodes[i]);
            msg_append(msg);
         }
      }
   }
   
   // check for new message if time stamping is on
   if (first_tstamp) {
      var msg = ODBGetMsg(facility, first_tstamp, 0);
      msg_prepend(msg);
   }
   
   // remove color of elements
   for (i=2 ; i<mf.childNodes.length ; i++) {
      if (mf.childNodes[i].age != undefined) {
         t = new Date()/1000;
         if (t > mf.childNodes[i].age + 5)
            mf.childNodes[i].style.backgroundColor = "";
      }
   }
   window.setTimeout(msg_extend, 1000);
}

