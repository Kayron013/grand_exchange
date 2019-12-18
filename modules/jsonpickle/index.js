const spawn = require('child_process').spawn;

module.exports.load = pickle => {
  return new Promise((resolve, reject) => {
    const convert = spawn('python', [__dirname + '/convert.py', '--loads']),
      stdout_buffer = [];

    convert.stdout.on('data', function(data) {
      stdout_buffer.push(data);
    });

    convert.on('exit', _ => {
      const data = stdout_buffer.join('');
      if (data == -1) {
        reject('could not load pickle');
      } else {
        let result;
        try {
          result = JSON.parse(data);
          resolve(result);
        } catch (err) {
          result = false;
          reject('could not parse json');
        }
        resolve(result);
      }
    });

    convert.stdin.write(pickle);
    convert.stdin.end();
  });
};
