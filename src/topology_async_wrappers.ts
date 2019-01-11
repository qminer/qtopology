import * as intf from "./topology_interfaces";

/** Wrapper for async bolt that transforms it into normal, callback-based bolt */
export class BoltAsyncWrapper implements intf.IBolt {

    private inner: intf.IBoltAsync;

    constructor(obj: intf.IBoltAsync) {
        this.inner = obj;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback): void {
        const new_config: intf.IBoltAsyncConfig = Object.assign({}, config);
        new_config.onEmit = (data: any, stream_id: string): Promise<void> => {
            return new Promise((resolve, reject) => {
                config.emit(data, stream_id, (err: Error) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        };
        this.inner.init(name, config, context)
            .then(() => { callback(); })
            .catch(callback);
    }

    public heartbeat(): void { this.inner.heartbeat(); }

    public shutdown(callback: intf.SimpleCallback): void {
        this.inner.shutdown()
            .then(() => { callback(); })
            .catch(callback);
    }

    public receive(data: any, stream_id: string, callback: intf.SimpleCallback): void {
        this.inner.receive(data, stream_id)
            .then(() => { callback(); })
            .catch(callback);
    }
}

/** Wrapper for async spout that transforms it into normal, callback-based spout */
export class SpoutAsyncWrapper implements intf.ISpout {

    private inner: intf.ISpoutAsync;

    constructor(obj: intf.ISpoutAsync) {
        this.inner = obj;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback): void {
        this.inner.init(name, config, context)
            .then(() => { callback(); })
            .catch(callback);
    }

    public shutdown(callback: intf.SimpleCallback): void {
        this.inner.shutdown()
            .then(() => { callback(); })
            .catch(callback);
    }

    public heartbeat(): void { this.inner.heartbeat(); }
    public run(): void { this.inner.run(); }
    public pause(): void { this.inner.pause(); }

    public next(callback: intf.SpoutNextCallback): void {
        this.inner.next()
            .then(res => {
                if (res) {
                    callback(null, res.data, res.stream_id);
                } else {
                    callback(null, null, null);
                }
            })
            .catch(err => { callback(err, null, null); });
    }
}
