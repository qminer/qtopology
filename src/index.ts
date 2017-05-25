import * as tc from "./topology_compiler";
import * as tl from "./topology_local";
import * as dw from "./distributed/topology_worker";
import * as dsf from "./distributed/file_based/file_coordinator";
import * as dshs from "./distributed/http_based/http_coordination_storage";
import * as dshc from "./distributed/http_based/http_coordinator";
import * as tv from "./topology_validation";
import * as ul from "./util/logger";
import * as uc from "./util/cmdline";
import * as upm from "./util/pattern_matcher";
import * as cpr from "./util/child_proc_restarter";

let main = {
    // used for compiling configuration
    compiler: tc,
    // used for running single local topology in same process
    local: tl,
    // when running fully capable topology workers
    distributed: {
        // for single worker
        worker: dw,
        // std coordination providers
        std_coordinators: {
            // simple file-based coordination
            file: {
                coordinator: dsf
            },
            // simple HTTP-based coordination
            http: {
                storage: dshs,
                coordinator: dshc
            }
        }
    },
    // some exposed utilities
    util: {
        // for logging stuff
        logging: ul,
        // for validating schema
        validation: tv,
        // easier parsing of command line
        cmdline: uc,
        // for matching objects to certain pattern/query
        pattern_matcher: upm,
        // utiliy class for continously running a child process
        child_process_restarter: cpr
    }
};

export default main;
