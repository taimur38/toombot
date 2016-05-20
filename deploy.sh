set -e
echo $1
docker build -t astor.watson-proto.blue:5000/toombot:$1 .
docker push astor.watson-proto.blue:5000/toombot:$1
echo "pushed $1"
