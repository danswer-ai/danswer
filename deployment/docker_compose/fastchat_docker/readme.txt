--To Start vlm

docker-cmpose up -d
------------------

1) docker cp mixstral.conf fastchat_v1:/code
   docker exec -u 0 -it fastchat_v1 bash
   supervisord -c mixstral.conf

2) docker cp jaisv3.conf fastchat_v1:/code
   docker exec -u 0 -it fastchat_v1 bash
   supervisord -c jaisv3.conf