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
declare let main: {
    compiler: typeof tc;
    local: typeof tl;
    distributed: {
        worker: typeof dw;
        std_coordinators: {
            file: {
                coordinator: typeof dsf;
            };
            http: {
                storage: typeof dshs;
                coordinator: typeof dshc;
            };
        };
    };
    util: {
        logging: typeof ul;
        validation: typeof tv;
        cmdline: typeof uc;
        pattern_matcher: typeof upm;
        child_process_restarter: typeof cpr;
    };
};
export default main;
