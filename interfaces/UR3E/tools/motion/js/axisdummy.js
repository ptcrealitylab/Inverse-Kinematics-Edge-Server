import * as THREE from 'three';

export class AxisDummy extends THREE.Group {
    constructor(ringAxis, ringNeeded, x, y, z) {

        super();

        // Robot dummy for Object Target
        const geometrycube = new THREE.BoxGeometry( 20, 20, 20 );
        const materialcube = new THREE.MeshBasicMaterial( {color: 0xffffff} );
        let robotDummy = new THREE.Mesh( geometrycube, materialcube );
        robotDummy.position.set(0,0,0);
        this.add( robotDummy );
        
        // To visualize axis with cubes uncomment this
        
        /*const materialcube_x = new THREE.MeshBasicMaterial( {color: 0xff0000} );
        let dummy_x = new THREE.Mesh( geometrycube, materialcube_x );
        robotDummy.add(dummy_x);
        dummy_x.position.set(50,0,0);

        const materialcube_z = new THREE.MeshBasicMaterial( {color: 0x0000ff} );
        let dummy_z = new THREE.Mesh( geometrycube, materialcube_z );
        robotDummy.add(dummy_z);
        dummy_z.position.set(0,0,50);
        
        const materialcube_y = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
        let dummy_y = new THREE.Mesh( geometrycube, materialcube_y );
        robotDummy.add(dummy_y);
        dummy_y.position.set(0,50,0);*/

        if(ringNeeded) {
            let radius = 50;

            const geometryOuterRing = new THREE.RingGeometry( radius-5, radius, 30, 8, 0, 2*Math.PI );
            const materialOuterRing = new THREE.MeshBasicMaterial( {color: 0x000000, side: THREE.DoubleSide} );
            this.outerRing = new THREE.Mesh( geometryOuterRing, materialOuterRing );
            robotDummy.add(this.outerRing);
            switch(ringAxis) {
                case "Y":
                    this.outerRing.rotateX(Math.PI/2);
                    break;
                case "Z":
                    this.outerRing.rotateY(Math.PI/2);
                    break;
                default:
                    break;
            }
            this.outerRing.position.set(0,0,0);

            let rotation = Math.PI/3;

            const geometryInnerRingTop = new THREE.RingGeometry( radius-5, radius, 30, 8, 0, rotation );
            const materialInnerRingTop = new THREE.MeshBasicMaterial( {color:0x00ff00, side: THREE.DoubleSide} );
            this.innerRingTop = new THREE.Mesh( geometryInnerRingTop, materialInnerRingTop );
            this.outerRing.add(this.innerRingTop);
            this.innerRingTop.position.set(0,0,0.5);

            const geometryTickTop = new THREE.PlaneGeometry( 2, 10 );
            const materialTickTop = new THREE.MeshBasicMaterial( {color:0x00ff00, side: THREE.DoubleSide} );
            this.tickTop = new THREE.Mesh( geometryTickTop, materialTickTop );
            this.innerRingTop.add(this.tickTop);
            this.tickTop.position.set(Math.cos(rotation) * radius,Math.sin(rotation) * radius,0);
            this.tickTop.rotateZ(rotation - Math.PI/2);

            this.innerRingBottom = this.innerRingTop.clone()
            this.outerRing.add(this.innerRingBottom);
            this.innerRingBottom.position.set(0,0,-0.5);

            this.tickBottom = this.tickTop.clone()
            this.innerRingBottom.add(this.tickBottom);
            this.tickBottom.position.set(Math.cos(rotation) * radius,Math.sin(rotation) * radius,0);

            this.canvas = this.makeLabelCanvas(124, 124, 'Hello');
            this.texture = new THREE.CanvasTexture(this.canvas);
            let labelMaterial = new THREE.SpriteMaterial({
                map: this.texture,
                transparent: true
            })
            let textScale = 64;
            this.planeNumber = new THREE.Sprite(labelMaterial);
            this.add(this.planeNumber);
            this.planeNumber.position.set(0,0,0);
            this.planeNumber.scale.x = textScale;
            this.planeNumber.scale.y = textScale;

            let r = 20;
            const materialArm = new THREE.MeshBasicMaterial({color:0x00ff00, side: THREE.DoubleSide});
            if(x != 0) {
                const geometryArmX = new THREE.CylinderGeometry( r, r, x, 32 );
                this.cylinderX = new THREE.Mesh( geometryArmX, materialArm );
                this.add( this.cylinderX );
                this.cylinderX.rotateZ(Math.PI/2);
                this.cylinderX.position.set(x/2,0,0);
            }

            if(y != 0) {
                const geometryArmY = new THREE.CylinderGeometry( r, r, y, 32 );
                this.cylinderY = new THREE.Mesh( geometryArmY, materialArm );
                this.add( this.cylinderY );
                this.cylinderY.position.set(x,y/2,0);
            }

            if(z != 0) {
                const geometryArmZ = new THREE.CylinderGeometry( r, r, z, 32 );
                this.cylinderZ = new THREE.Mesh( geometryArmZ, materialArm );
                this.add( this.cylinderZ );
                this.cylinderZ.rotateX(Math.PI/2);
                this.cylinderZ.position.set(x,y,z/2);
            }

        }
    }

    update(rotation) {
        this.outerRing.remove(this.innerRingTop);
        this.outerRing.remove(this.innerRingBottom);
        this.remove(this.planeNumber);
        let deg = Math.round(rotation * 180/Math.PI);

        let radius = 50;
        const geometryInnerRingTop = new THREE.RingGeometry( radius-5, radius, 30, 8, 0, rotation );
        const materialInnerRingTop = new THREE.MeshBasicMaterial( {color:0x00ff00, side: THREE.DoubleSide} );
        this.innerRingTop = new THREE.Mesh( geometryInnerRingTop, materialInnerRingTop );
        this.outerRing.add(this.innerRingTop);
        this.innerRingTop.position.set(0,0,0.5);

        const geometryTickTop = new THREE.PlaneGeometry( 2, 10 );
        const materialTickTop = new THREE.MeshBasicMaterial( {color:0x00ff00, side: THREE.DoubleSide} );
        this.tickTop = new THREE.Mesh( geometryTickTop, materialTickTop );
        this.innerRingTop.add(this.tickTop);
        this.tickTop.position.set(Math.cos(rotation) * radius,Math.sin(rotation) * radius,0);
        this.tickTop.rotateZ(rotation - Math.PI/2);

        this.innerRingBottom = this.innerRingTop.clone()
        this.outerRing.add(this.innerRingBottom);
        this.innerRingBottom.position.set(0,0,-0.5);

        this.tickBottom = this.tickTop.clone()
        this.innerRingBottom.add(this.tickBottom);
        this.tickBottom.position.set(Math.cos(rotation) * radius,Math.sin(rotation) * radius,0);

        this.canvas = this.makeLabelCanvas(124, 124, deg.toString());
        this.texture = new THREE.CanvasTexture(this.canvas);
        let labelMaterial = new THREE.SpriteMaterial({
            map: this.texture,
            transparent: true
        })
        let textScale = 64;
        this.planeNumber = new THREE.Sprite(labelMaterial);
        this.add(this.planeNumber);
        this.planeNumber.position.set(0,0,0);
        this.planeNumber.scale.x = textScale;
        this.planeNumber.scale.y = textScale;
    }

    makeLabelCanvas(baseWidth, size, name) {
        const borderSize = 2;
        const ctx = document.createElement('canvas').getContext('2d');
        const font =  `${size}px bold sans-serif`;
        ctx.font = font;
        // measure how long the name will be
        const textWidth = ctx.measureText(name).width;
    
        const doubleBorderSize = borderSize * 2;
        const width = baseWidth + doubleBorderSize;
        const height = size + doubleBorderSize;
        ctx.canvas.width = width;
        ctx.canvas.height = height;
    
        // need to set font again after resizing canvas
        ctx.font = font;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
    
        /*ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, width, height);*/
    
        // scale to fit but don't stretch
        const scaleFactor = Math.min(1, baseWidth / textWidth);
        ctx.translate(width / 2, height / 2);
        ctx.scale(scaleFactor, -1); // -1 to flip the axis
        ctx.fillStyle = 'white';
        ctx.fillText(name, 0, 0);
    
        return ctx.canvas;
    }
}
