const spawn = require('child_process').spawn;

module.exports.load = pickle => {
  return new Promise(resolve => {
    const convert = spawn('python', [__dirname + '/convert.py', '--loads']),
      stdout_buffer = [];

    convert.stdout.on('data', function(data) {
      stdout_buffer.push(data);
    });

    convert.on('exit', _ => {
      const data = stdout_buffer.join('');
      if (data == -1) {
        resolve(false);
      } else {
        let result;
        try {
          result = JSON.parse(data);
        } catch (err) {
          console.log('failed parse', data);
          result = false;
        }
        resolve(result);
      }
    });

    convert.stdin.write(pickle);
    convert.stdin.end();
  });
};
