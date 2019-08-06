import sys
try:
    import simplejson as json
except ImportError:
    import json
try:
    import cPickle as pickle
except ImportError:
    import pickle

import codecs
import jsonpickle

def main(argv):
    try:
        buffer = sys.stdin.buffer.read()
        decoded = codecs.decode(buffer, 'base64')
        d = pickle.loads(decoded, encoding='latin1')
        j = jsonpickle.encode(d, False)
        sys.stdout.write(j)
    except:
        sys.stdout.write('-1')

if __name__ == '__main__':
    main(sys.argv[1:])
