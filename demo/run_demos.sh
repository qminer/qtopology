################################################################
## This script runs all (most?) of demo projects to check
## that they execute without error.
################################################################

set -e
start=`date +%s`

function title {
    echo ""
    echo "#######################################################"
    echo "## "$1 
    echo "#######################################################"
    echo ""
} 

#title "Running bomb demo"
#cd std_nodes/bomb
#node demo_bomb.js
#cd ../..

title "Running rest telemetry"
cd local
node demo_local.js
cd ..

title "Running rest telemetry"
cd std_nodes/telemetry
node demo_telemetry.js
cd ../..

title "Running rest demo"
cd std_nodes/rest
node demo_rest.js
cd ../..

title "Running rss demo"
cd std_nodes/rss
node demo_rss.js
cd ../..

title "Running process demo"
cd std_nodes/process
node demo_process.js
cd ../..

title "Running file_reader demo"
cd std_nodes/file_reader
node demo_file_reader.js
cd ../..

title "Running disabled demo"
cd std_nodes/disabled
node demo_disabling.js
cd ../..

title "Running file_append demo"
cd std_nodes/file_append
node demo_file_append.js
rm *.gz     # cleanup
cd ../..

title "Running dir_watcher demo"
cd std_nodes/dir_watcher
node demo_dir_watcher.js
cd ../..

title "Running counter demo"
cd std_nodes/counter
node demo_counter.js
cd ../..

title "Demos finished"
end=`date +%s`

runtime=$((end-start))
echo "Time needed: "$runtime" sec"
