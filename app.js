/*jslint node:true*/
var express = require('express'),
	path = require('path'),
	send = require('send'),
	fs = require('fs');

var app = express(),
	serverConfig = {
		port : 7733,
		root : '/'
		rootDir : 'static'
	},
	dirConfig = {
		listDir : true,
		dotFiles : 'allow',
		index :false,
		etag : true,
		extensions : ['html', 'htm'],
		lastModified : true,
		maxAge : 0
	};

function getDirectoryListing(files, location) {
	var response = '<html><head><title>Index of /' + location + '</title></head><body><style>table{font-size:17px;margin-top:30px;margin-bottom:30px}th,td{text-align:left;padding:5px;padding-left:15px;padding-right:15px;}</style><div><div><h1>Index of /' + location + '</h1></div><table><tr><th></th><th>Name</th><th>Last Modified</th><th>Size</th></tr>';
	if (location === ''){
		location = '.';
	}
	else{
		response += '<tr><td></td><td><a href="../">Parent Directory/</a></td><td>-</td><td>-</td></tr>';
	}

	for(var i in files){
				if(files[i].directory === true){
					files[i].filename += '/';
					files[i].size = '-';
				}
				response += '<tr><td></td><td><a href="/'+location+'/'+files[i].filename+'">'+files[i].filename+'</a></td><td>'+files[i].time+'</td><td>'+files[i].size+'</td></tr>';
			}
			response += '</table><hr/><div style="text-align:center">via <a target="_blank" href="http://arjunrp.github.io/static-node-server">static-node-server</a></div></div></body></html>';

	return response;
}
function errorTemplate(statusCode,url){
	var response = '<html><head><title>';
	switch(statusCode){
			case 404:{
				response+='404 Not Found</title><body><div><div><h1>Not found</h1></div><div style="padding-top:15px;padding-bottom:20px;">The requested URL '+url+' was not found on this server.</div><hr/><div style="text-align:center">via <a target="_blank" href="http://arjunrp.github.io/static-node-server">static-node-server</a></div></div></body></html>';
				break;
			}
			case 403:{
				response+='403 Forbidden</title><body><div><div><h1>Forbidden</h1></div><div style="padding-top:15px;padding-bottom:20px;">You don\'t have permission to access '+url+' on this server.</div><hr/><div style="text-align:center">via <a target="_blank" href="http://arjunrp.github.io/static-node-server">static-node-server</a></div></div></body></html>';
				break;
			}
			default:{
				response+='500 Internal Server Error</title><body><div><div><h1>Internal Server Error</h1></div><div style="padding-top:15px;padding-bottom:20px;">The server encountered an internal error and was unable to complete your request.</div><hr/><div style="text-align:center">via <a target="_blank" href="http://arjunrp.github.io/static-node-server">static-node-server</a></div></div></body></html>';
			}
	}
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
	folder = trimSlash(req.url);
	var location = path.join(__dirname,serverConfig.rootDir,folder);
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

			callback(null,getDirectoryListing(files,folder));
		}
	});
};

var getConfig = function(req,url,process){
	var file = (serverConfig.rootDir)+(url.substr(0,url.lastIndexOf('/')))+"/.dirConfig";
	fs.exists(file,function(result){
		if(result===true){
			fs.readFile(file,function(err,data){
				if(err){
					throw err;
				}
				else{
						try{
							data = JSON.parse(data);
							process(null,data,req);
						}
						catch(e){
							var err = new Error("dirconfig parse error");
							process(err,null,req);
						}
				}
			});
		}
		else{
			if(url=='/'){
				console.log('No dirconfig found');
			}
			else{
				url = url.substr(0,url.lastIndexOf('/',url.length-2))+"/";
				getConfig(req,url,process);
			}
		}
	});

};

app.use(serverConfig.root,function(req,res,next){
	/* Add option for directory wise configuration files as '.json' */


	var url = req.url+"";
	getConfig(req,url,function(err,data,req){
		if(err){
			next(err);
		}
		else{
			console.log(data,req.url);
		}
	});



	var stream = send(req,req.url,{
		root : serverConfig.rootDir,
		index : dirConfig.index,
		dotfiles : dirConfig.dotFiles,
		etag : dirConfig.etag,
		extensions : dirConfig.extensions,
		lastModified : dirConfig.lastModified,
		maxAge : dirConfig.maxAge
	});


	stream.on('error',function(err){
		if(err.code==='ENOENT'){
			err.status = 404;
			err.message = 'File Not Found';
			next(err);
		}
		else{
			next(err);
		}
	})
	.on('directory',function(){
		if(dirConfig.listDir===true){
			listDirectory(req,res,function(err,response){
				if(err){next(err)}
				res.send(response);
			});
		}
		else{
			err = new Error();
			err.status=403;
			next(err);
		}
	})
	.pipe(res);


})
.use(function(err,req,res){
	res.statusCode = err.status||500;
	res.send(errorTemplate(err.status,req.url));
})
.use('*', function(req,res){
	res.statusCode = 404;
	res.send(errorTemplate(404,req.url));
});

app.listen(serverConfig.port,function(err){
	if(err){
		console.log('error listening to port '+serverConfig.port);
	}
	else{
		console.log('static-node-server live on port '+serverConfig.port);
	}

});
