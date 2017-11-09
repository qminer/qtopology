echo "#### Running file_append demo"
cd std_nodes/file_append
node demo_file_append.js
rm *.gz     # cleanup
cd ../..

echo "#### Running dir_watcher demo"
cd std_nodes/dir_watcher
node demo_dir_watcher.js
cd ../..

echo "#### Demos finished"
