import * as intf from "./topology_interfaces";

export class BoltAsyncWrapper implements intf.IBolt {

    private obj: intf.IBoltAsync;

    constructor(obj: intf.IBoltAsync) {
        this.obj = obj;
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
        this.obj.init(name, config, context)
            .then(() => { callback(); })
            .catch(callback);
    }

    public heartbeat(): void { this.obj.heartbeat(); }

    public shutdown(callback: intf.SimpleCallback): void {
        this.obj.shutdown()
            .then(() => { callback(); })
            .catch(callback);
    }

    public receive(data: any, stream_id: string, callback: intf.SimpleCallback): void {
        this.obj.receive(data, stream_id)
            .then(() => { callback(); })
            .catch(callback);
    }
}

export class SpoutAsyncWrapper implements intf.ISpout {

    private obj: intf.ISpoutAsync;

    constructor(obj: intf.ISpoutAsync) {
        this.obj = obj;
    }

    public init(name: string, config: any, context: any, callback: intf.SimpleCallback): void {
        this.obj.init(name, config, context)
            .then(() => { callback(); })
            .catch(callback);
    }

    public shutdown(callback: intf.SimpleCallback): void {
        this.obj.shutdown()
            .then(() => { callback(); })
            .catch(callback);
    }

    public heartbeat(): void { this.obj.heartbeat(); }
    public run(): void { this.obj.run(); }
    public pause(): void { this.obj.pause(); }

    public next(callback: intf.SpoutNextCallback): void {
        this.obj.next()
            .then(res => { callback(null, res.data, res.stream_id); })
            .catch(err => { callback(err, null, null); });
    }
}
