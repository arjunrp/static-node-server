/*jslint node:true*/
var express = require('express'),
	serveStatic = require('serve-static'),
	path = require('path'),
	send = require('send'),
	fs = require('fs');

var app = express(),
	APP_PORT = 7733,
	LIST_DIR = true,
	ROOT = '/',
	ROOT_DIR = 'static';



function getDirectoryListing(files){
	var response = "<html><head><title>Index of</title></head><body><style>table{font-size:17px;margin-top:30px;margin-bottom:30px}th,td{text-align:left;padding:5px;padding-left:15px;padding-right:15px;}</style><div><div><h2>Index of /</h2></div><hr/><table><tr><th></th><th>Name</th><th>Last Modified</th><th>Size</th></tr>";

	for(var i in files){
				response+='<tr><td></td><td>'+files[i].filename+'</td><td>'+files[i].time+'</td><td>'+files[i].size+'</td></tr>';
			}
			response+="</table><hr/><div style='text-align:center'>via <a target='_blank' href='http://arjunrp.github.io/node-server'>node-server</a></div></div></body></html>";

	return response;
}
function trimSlash(str){
	var len = str.length;
	if(str[0]=='/'){
		str = str.slice(1);
	}
	if(str[len-2]=='/'){
		str = str.slice(0,len-2);
	}
	return str;

}
var listDirectory = function(req,res,callback){
	//res.send('Showing contents of '+req.path+"--"+req.url);

	var location = path.join(__dirname,ROOT_DIR,trimSlash(req.url));


	fs.readdir(location,function(err,files){
		if(err){
			callback(err,null);
		}
		else{
			var stat=null;
			files = files.map(function(file){
				try{
					stat = fs.statSync(path.join(location,file));
				}
				catch(e){
					return e;
				}
				if(stat){
					return {'filename':file,'time':stat.mtime.toUTCString(),'size':stat.size,'directory':stat.isDirectory()};
				}
			});

			callback(null,getDirectoryListing(files));
		}
	});
};

app.use(ROOT,function(req,res,next){

	if(req.path==='/' && LIST_DIR===true ){
		//listDirectory(req,res);
		//res.end("show dir listing");
	}


	//path = 'static\\'+path;



	var stream = send(req,req.url,{root:ROOT_DIR,index:false});

	stream.on('error',function(err){
		if(err.code==='ENOENT'){
			next();
		}
		//console.log(err);
	});
	stream.on('directory',function(){
		listDirectory(req,res,function(err,response){
			if(err){}
			res.send(response);
		});
	});


	stream.pipe(res);
});
/*
app.use('/static',express.static(PUBLIC,{index:'index.js'}));

*/
app.use('*',function(req,res){
	res.statusCode=404;
	res.end('--NOT FOUND--');
});

app.listen(APP_PORT);
