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



function getDirectoryListing(files,location){
	var response = '<html><head><title>Index of /'+location+'</title></head><body><style>table{font-size:17px;margin-top:30px;margin-bottom:30px}th,td{text-align:left;padding:5px;padding-left:15px;padding-right:15px;}</style><div><div><h2>Index of /'+location+'</h2></div><hr/><table><tr><th></th><th>Name</th><th>Last Modified</th><th>Size</th></tr>';
	if(location===''){
		location = '.';
	}
	else{
		response+='<tr><td></td><td><a href="../">Parent Directory/</a></td><td>--</td><td>--</td></tr>';
	}

	for(var i in files){
				if(files[i].directory===true){
					files[i].filename+='/';
				}
				response+='<tr><td></td><td><a href="/'+location+'/'+files[i].filename+'">'+files[i].filename+'</a></td><td>'+files[i].time+'</td><td>'+files[i].size+'</td></tr>';
			}
			response+="</table><hr/><div style='text-align:center'>via <a target='_blank' href='arjunrp.github.io/node-server'>node-server</a></div></div></body></html>";

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
	var location = path.join(__dirname,ROOT_DIR,folder);
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

app.use(ROOT,function(req,res,next){
	var stream = send(req,req.url,{root:ROOT_DIR,index:false});
	stream.on('error',function(err){
		if(err.code==='ENOENT'){
			next();
		}
	})
	.on('directory',function(){
		listDirectory(req,res,function(err,response){
			if(err){}
			res.send(response);
		});
	})
	.pipe(res);
});

app.use(ROOT,function(err,req,res,next){
	if(err.code=403){
		res.status(400).send('---');
	}

	//next();
})

/*
app.use('*',function(req,res){
	res.statusCode=404;
	res.end('--NOT FOUND--');
});
*/
app.listen(APP_PORT);
