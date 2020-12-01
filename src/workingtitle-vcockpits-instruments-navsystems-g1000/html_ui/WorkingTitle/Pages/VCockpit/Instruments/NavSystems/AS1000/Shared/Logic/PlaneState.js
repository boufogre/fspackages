class WT_Plane_State {
    /**
     * @param {Subject} electricityAvailable 
     */
    constructor(update$, electricityAvailable) {
        this.onShutDown = new WT_Event();
        this.onPowerOn = new WT_Event();
        this.powerState = new Subject(false);
        this.electricity = electricityAvailable;

        this.coordinates = rxjs.zip(
            WT_RX.observeSimVar(update$, "PLANE LATITUDE", "degree latitude", false),
            WT_RX.observeSimVar(update$, "PLANE LONGITUDE", "degree longitude", false)
        ).pipe(
            rxjs.operators.map(([lat, long]) => new LatLong(lat, long)),
            rxjs.operators.shareReplay(1),
        );

        this.indicatedAltitude = WT_RX.observeSimVar(update$, "INDICATED ALTITUDE", "feet");
        this.groundSpeed = WT_RX.observeSimVar(update$, "GPS GROUND SPEED", "kilometers per hour");
        
        this.heading = WT_RX.observeSimVar(update$, "PLANE HEADING DEGREES MAGNETIC", "degree");

        this.onGround = this.groundSpeed.pipe(
            rxjs.operators.map(speed => speed < 90),
            rxjs.operators.distinctUntilChanged(),
            rxjs.operators.shareReplay(1)
        )

        this.inAir = this.groundSpeed.pipe(
            rxjs.operators.map(speed => speed > 90),
            rxjs.operators.distinctUntilChanged(),
            rxjs.operators.shareReplay(1)
        )
    }
    getLowResCoordinates(resolution) {
        return this.coordinates.pipe(
            rxjs.operators.scan((previousPosition, current) => {
                if (previousPosition == null)
                    return current;
                const movedFarEnough = Avionics.Utils.computeGreatCircleDistance(previousPosition, current) > resolution;
                return movedFarEnough ? current : previousPosition
            }, null),
            rxjs.operators.distinctUntilChanged()
        );
    }
    powerOn() {
        this.onPowerOn.fire();
        this.powerState.value = true;
    }
    shutDown() {
        this.onShutDown.fire();
        this.powerState.value = false;
    }
}