import * as THREE from 'three';
import FBXLoader from "three-fbx-loader";

import {AxisDummy} from "./axisdummy";
import {RobotDummy} from "./robotdummy";
import {setMatrixFromArray} from "./utils";
import EventEmitter from 'eventemitter3';
import {Path} from "./path";
import {MotionVisualization} from "./motionvisualization";

window.THREE = THREE;
import { GLTFLoader } from 'three/examples/js/loaders/GLTFLoader';

/**
 * @desc this class will hold functions for the THREEjs view
 * examples include createNewPath(), moveSelectedCheckpoint(), activateCheckpointMode(), showCheckpointArrows()
 * @author Anna Fuste
 * @required eventemitter3, three, three-fbx-loader, axisdummy.js, robotdummy.js, utils.js, path.js, motionvisualization.js
 */
export class KineticARView extends EventEmitter{
    constructor(){

        super();

        this.scene = new THREE.Scene();

        this.rendererWidth = screen.height;
        this.rendererHeight = screen.width;
        let aspectRatio = this.rendererWidth / this.rendererHeight;

        this.camera = new THREE.PerspectiveCamera( 70, aspectRatio, 1, Number.MAX_VALUE );
        this.camera.matrixAutoUpdate = false;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize( this.rendererWidth, this.rendererHeight );

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.previousMouseY = 0;

        // create a parent 3D object to contain all the three js objects
        // we can apply the marker transform to this object and all of its
        // children objects will be affected
        this.groundPlaneContainerObj = new THREE.Object3D();
        this.groundPlaneContainerObj.matrixAutoUpdate = false;
        this.scene.add(this.groundPlaneContainerObj);

        this.robotDummy = new AxisDummy("X", false);                                                                      // Object overlaid on object target when tracked
        this.robotDummy.matrixAutoUpdate = false;
        this.scene.add( this.robotDummy );

        this.dummy_anchor = null;                                                                                       // Robot Anchor to Ground Plane

        this.J1 = null;
        this.J2 = null;
        this.J3 = null;
        this.J4 = null;
        this.J5 = null;
        this.J6 = null;
        this.ringsMade = false;
        this.J1Angle = 0;
        this.J2Angle = 0;
        this.J3Angle = 0;
        this.J4Angle = 0;
        this.J5Angle = 0;
        this.J6Angle = 0;
        /*this.J3World = new THREE.Vector3();
        this.BaseWorld = new THREE.Vector3();
        this.RotMatrix = new THREE.Matrix3();
        this.temp = new AxisDummy();
        this.RotMatrix.set( 0, 1, 0,
                            -1, 0, 0,
                            0, 0, 1);*/

        this.dummy_groundPlaneOrigin = this.robotDummy.clone();                                                         // Ground Plane Origin
        this.scene.remove(this.dummy_groundPlaneOrigin);
        this.groundPlaneContainerObj.add(this.dummy_groundPlaneOrigin);
        this.dummy_groundPlaneOrigin.position.set(0,0,0);

        this.dummy_occlusion = new RobotDummy();                                                                        // Realtime robot object from physical robot
        this.dummy_occlusion.matrixAutoUpdate = false;
        //this.groundPlaneContainerObj.add(this.dummy_occlusion);
        this.dummy_occlusion.position.set(0,0,0);
        this.dummy_occlusion.updateMatrix();

        /*
        // Phone pointer on surface
        this.dummy_phonePointer = new SurfaceMarker();
        this.groundPlaneContainerObj.add(this.dummy_phonePointer);
        this.dummy_phonePointer.position.set(0,0,0);
        */

        this.scene.add(new THREE.HemisphereLight(0xffffff, 1.5));

        this.motionViz = new MotionVisualization(this.groundPlaneContainerObj);

        this.counter = 0;

        this.isProjectionMatrixSet = false;
        this.isGroundPlaneTracked = false;
        this.isRobotAnchorSet = false;

        this.lastPosition = new THREE.Vector3(0,0,0);                                                          // Last position to compute path
        this.lastDirection = new THREE.Vector3(1,1,1);                                                         // Last direction to compute path

        this.paths = [];                                                                                                // List with all path objects
        this.currentPath = null;

        // Load FBX model for checkpoints base
        const fbxloader = new FBXLoader();
        this.checkpointbaseFloating = null;
        this.checkpointbaseGrounded = null;

        fbxloader.load( 'assets/models/KineticAR_Locator_01.fbx',  ( object ) => {                          // Only load FBX once
            this.checkpointbaseFloating = object.getObjectByName( "LOCATOR___FLOATINGModel" );
            this.checkpointbaseGrounded = object.getObjectByName( "LOCATOR___GROUNDEDModel" );
            console.log('FBX LOADED');
        });

        
        this.fanuc_robot = new THREE.Group();
        let fanuc_gltf = new THREE.Group();
        let full_fanuc = new THREE.Group();
        let fanuc_j1 = new THREE.Group();
        let fanuc_j2 = new THREE.Group();
        let fanuc_j3 = new THREE.Group();
        let fanuc_j4 = new THREE.Group();
        let fanuc_j5 = new THREE.Group();
        let fanuc_j6 = new THREE.Group();
        let base = new THREE.Group();
        // let fanuc_anim;
        const fanucloader = new THREE.GLTFLoader();
        fanucloader.load(
            // resource URL
            'assets/models/Full_FANUC.gltf',
            ( gltf ) => {
                full_fanuc = gltf.scene.clone().children[0];
                fanuc_gltf = gltf.scene.clone(false);
                console.log(fanuc_gltf);
                full_fanuc.children = [];
                gltf.scene.traverse(function (child) {

                    if (child.name === 'occurrence_of_J5J6'){
                        fanuc_j5 = child;
                    }

                    if (child.name === 'occurrence_of_J2J3'){
                        fanuc_j2 = child;
                    }
                    if (child.name === 'occurrence_of_J1J2'){
                        fanuc_j1 = child;
                    }

                    if (child.name === 'occurrence_of_J3J4'){
                        fanuc_j3 = child;
                    }
                    if (child.name === 'occurrence_of_BaseJ1'){
                        base = child;
                    }
                    if (child.name === 'occurrence_of_J6End'){
                        fanuc_j6 = child;
                    }
                    if (child.name === 'occurrence_of_J4J5'){
                        fanuc_j4 = child;
                    }

                });

                let j1axis = new THREE.AxesHelper( .20 );
                let j2axis = new THREE.AxesHelper( .20 );
                let j3axis = new THREE.AxesHelper( .20 );
                let j4axis = new THREE.AxesHelper( .20 );
                let j5axis = new THREE.AxesHelper( .20 );
                let j6axis = new THREE.AxesHelper( .20 );
                // console.log(this.groundPlaneContainerObj);
                // this.groundPlaneContainerObj.attach(fanuc_gltf);

                this.scene.add(fanuc_gltf);
                fanuc_gltf.attach(full_fanuc);
                full_fanuc.attach(base);
                base.attach(fanuc_j1);
                fanuc_j1.add(j1axis);
                fanuc_j1.attach(fanuc_j2);
                fanuc_j1.add(j1axis);
                fanuc_j2.attach(fanuc_j3);
                fanuc_j2.add(j2axis);
                fanuc_j3.attach(fanuc_j4);
                fanuc_j3.add(j3axis);
                fanuc_j4.attach(fanuc_j5);
                fanuc_j4.add(j4axis);
                fanuc_j5.attach(fanuc_j6);
                fanuc_j5.add(j5axis);

                fanuc_gltf.scale.set(200, 200, 200);
                fanuc_gltf.position.set(0,0,0);
                this.fanuc_robot = fanuc_gltf;
                
                console.log(fanuc_gltf);
            },
            // called while loading is progressing
            function ( xhr ) {

                console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

            },
            // called when loading has errors
            function ( error ) {

                console.log( error );

            }
        );
        this.firstEdit = true;

        this.activateCheckpointMode = this.activateCheckpointMode.bind(this);
        this.editCheckpoint = this.editCheckpoint.bind(this);
        this.anchorRobotToGroundPlane = this.anchorRobotToGroundPlane.bind(this);
        this.updateDevices = this.updateDevices.bind(this);
        this.clearRenderInDevices = this.clearRenderInDevices.bind(this);
    }

    /*
    * Create a new path with first checkpoint and send path data to server
    */
    createNewPath(newPosition){

        this.currentPath = new Path(this.groundPlaneContainerObj, this.paths.length, this.checkpointbaseFloating, this.checkpointbaseGrounded, this.dummy_anchor); // We create the first path

        this.paths.push(this.currentPath);

    }

    moveSelectedCheckpoint(newPosition){

        let positionGP = new THREE.Vector3();
        positionGP.copy(newPosition);
        this.currentPath.parentContainer.worldToLocal(positionGP);

        //this.currentPath.selectedCheckpoint.position.copy(positionGP);
        this.currentPath.selectedCheckpoint.editPosition(positionGP);

        if (this.currentPath.checkpoints.length > 1){
            this.currentPath.updateSpline();
            this.currentPath.updateFloorSpline();

        }
        this.currentPath.updateHeightLinesAndFloorMarks();

    }

    activateCheckpointMode(mode){
        if (this.currentPath !== null) this.currentPath.activateSelectedCheckpointMode(mode);
    }

    showCheckpointArrows(){
        this.currentPath.selectedCheckpoint.showPositionArrows();
    }
    hideCheckpointArrows(){
        this.currentPath.selectedCheckpoint.hidePositionArrows();
    }

    adjustPosition(mode){
        switch (mode) {
            case 0:
                // Position Right
                this.currentPath.selectedCheckpoint.position.x += 10;
                break;
            case 1:
                // Position Left
                this.currentPath.selectedCheckpoint.position.x -= 10;
                break;
            case 2:
                // Position Up
                this.currentPath.selectedCheckpoint.position.z += 10;
                break;
            case 3:
                // Position Down
                this.currentPath.selectedCheckpoint.position.z -= 10;
                break;
            default:
                break;
        }
        if (this.currentPath.checkpoints.length > 1) {
            this.currentPath.updateSpline();
            this.currentPath.updateFloorSpline();
            this.currentPath.updateHeightLinesAndFloorMarks();
        }
    }

    editCheckpoint(eventData, newPosition, mode){

        if (this.currentPath !== null &&
            this.currentPath.selectedCheckpoint !== null &&
            this.currentPath.selectedCheckpoint.isEditionActive()){

            this.currentPath.closeReset();  // Reset the counter in order to not show the checkpointUI when editing

            switch (mode) {
                case 1:
                    this.currentPath.selectedCheckpoint.editRotation(this.getDeltaMouse(eventData));
                    break;
                case 2:
                    this.currentPath.selectedCheckpoint.editSpeed(this.getDeltaMouse(eventData));

                    if (this.currentPath.checkpoints.length > 1){
                        this.currentPath.updateSpline();
                        this.currentPath.updateFloorSpline();
                    }
                    break;
                case 3:

                    let delta = this.getDeltaMouse(eventData);
                    let newHeight = this.currentPath.selectedCheckpoint.height + delta * 1000;  // In mm

                    if (newHeight >= 0){    // prevent from going under the surface

                        this.currentPath.selectedCheckpoint.editHeight(newHeight);

                        if (this.currentPath.checkpoints.length > 1){
                            this.currentPath.updateSpline();
                            this.currentPath.updateFloorSpline();
                        }

                        this.currentPath.updateHeightLinesAndFloorMarks();
                    }

                    break;
                default:
                    break;
            }
        }
    }

    closeEdit(){
        this.firstEdit = true;
    }

    setGroundPlaneMatrix(groundPlaneMatrix, projectionMatrix){
        // only set the projection matrix for the camera 1 time, since it stays the same
        if (!this.isProjectionMatrixSet && projectionMatrix.length > 0) {
            setMatrixFromArray(this.camera.projectionMatrix, projectionMatrix);
            this.isProjectionMatrixSet = true;
        }

        if (this.isProjectionMatrixSet) {                                                // don't turn into else statement, both can happen

            setMatrixFromArray(this.groundPlaneContainerObj.matrix, groundPlaneMatrix);  // update model view matrix
            this.groundPlaneContainerObj.visible = true;

            this.update();

            if (!this.isGroundPlaneTracked) this.emit('surfaceTracked');
            this.isGroundPlaneTracked = true;
        }
    }

    renderRobot(modelviewmatrix, projectionMatrix){

        // Once the object is tracked and the frame is set to full frame, this callback keeps on getting called even if we don't see the object target.
        // This is needed to prevent from assigning a null matrix to the robot dummy
        // If this is not checked, we will get a constant warning when loosing the object target
        if (modelviewmatrix[0] !== null){

            // Update model view matrix
            setMatrixFromArray(this.robotDummy.matrix, modelviewmatrix);
            this.robotDummy.visible = true;

            this.counter++;
            if (this.counter > 100 && !this.isRobotAnchorSet && this.isGroundPlaneTracked){

                this.anchorRobotToGroundPlane();

                this.emit('robotAnchored');

                this.isRobotAnchorSet = true;
            }
        } else {
            this.robotDummy.visible = false;
        }
    }

    anchorRobotToGroundPlane(){

        this.dummy_anchor = this.robotDummy.clone();

        THREE.SceneUtils.attach( this.dummy_anchor, this.scene, this.groundPlaneContainerObj ); // This will remove robot dummy from scene and anchor to ground plane

        this.dummy_anchor.translateX(200);
        this.dummy_anchor.translateY(375);
        this.dummy_anchor.rotateZ(-Math.PI/2);
        this.dummy_anchor.matrixAutoUpdate = true;
        this.dummy_anchor.updateMatrix();

        this.J1 = new AxisDummy("X", true, 63, 0, 57);
        this.dummy_anchor.add(this.J1);
        this.J1.position.set(0, 0, 94.95);
        this.J2 = new AxisDummy("Z", true, 11, -244, 0);
        this.J1.add(this.J2);
        this.J2.position.set(62.95, 0, 56.9);
        //this.obj3 = new AxisDummy("Z", true);
        //this.obj3.position.set(10.6, -243.55, 0);
        this.J3 = new AxisDummy("X", true, -3, -213, 0);
        this.J2.add(this.J3);
        this.J3.position.set(10.6, -243.55, 0);
        //MAKE CYLINDERS FOR EACH ARM SO I DONT GO CRAZY
        this.J4 = new AxisDummy("Z", true, 61, 0, -43);
        this.J3.add(this.J4);
        this.J4.position.set(-3.45, -213.2, 0);
        this.J5 = new AxisDummy("X", true, 43, 0, -42);
        this.J4.add(this.J5);
        this.J5.position.set(60.95, 0, -43.1);
        this.J6 = new AxisDummy("Z", true);
        this.J5.add(this.J6);
        this.J6.position.set(43.1, 0, -42.25);
        this.ringsMade = true;

    }

    setJAngle(joint, angle) {
        if(this.isRobotAnchorSet) {
            angle = angle*Math.PI/180;
            switch(joint) {
                case "J1":
                    this.J1.rotateZ(angle);
                    this.J1Angle = angle;
                    this.J1.update(angle);
                    break;
                case "J2":
                    this.J2.rotateX(angle);
                    this.J2Angle = angle;
                    this.J2.update(angle);
                    break;
                case "J3":
                    this.J3.rotateX(angle);
                    this.J3Angle = angle;
                    this.J3.update(angle);
                    break;
                case "J4":
                    this.J4.rotateX(angle);
                    this.J4Angle = angle;
                    this.J4.update(angle);
                    break;
                case "J5":
                    this.J5.rotateX(angle);
                    this.J5Angle = angle;
                    this.J5.update(angle);
                    break;
                case "J6":
                    this.J6.rotateZ(angle);
                    this.J6Angle = angle;
                    this.J6.update(angle);
                    break;
                default:
                    return false;
            }
            return true;
        }
        return false;
    }

    updateJPos(joint, angle) {
        angle = angle * Math.PI/180;
        switch(joint) {
            case "J1":
                this.J1.rotateZ(angle-this.J1Angle);
                this.J1Angle = angle;
                this.J1.update(angle);
                break;
            case "J2":
                this.J2.rotateX(angle-this.J2Angle);
                this.J2Angle = angle;
                this.J2.update(angle);
                break;
            case "J3":
                this.J3.rotateX(angle-this.J3Angle);
                this.J3Angle = angle;
                this.J3.update(angle);
                break;
            case "J4":
                this.J4.rotateX(angle-this.J4Angle);
                this.J4Angle = angle;
                this.J4.update(angle);
                break;
            //Think something is wrong with this one?
            case "J5":
                this.J5.rotateX(angle-this.J5Angle);
                this.J5Angle = angle;
                this.J5.update(angle); 
                break;
            case "J6":
                this.J6.rotateZ(angle-this.J6Angle);
                this.J6Angle = angle;
                this.J6.update(angle);
                break;
            default:
                break;
        }
    }

    /*
    ** Method to update realtime Robot dummy in frame
    ** data that comes from server:
    **      data.x, data.y          - realtime MIR AR position
    **      data.z                  - realtime MIR AR orientation
    */
    moveDummyRobot(data){
        if (this.dummy_anchor != null){
            let newPosition = new THREE.Vector3(data.x * 1000, this.dummy_anchor.position.y , data.y * 1000);
            this.dummy_occlusion.position.set(newPosition.x, newPosition.y , newPosition.z);
            this.dummy_occlusion.rotation.set(this.dummy_occlusion.rotation.x, data.z, this.dummy_occlusion.rotation.z);
            this.dummy_occlusion.updateMatrix();
            this.motionViz.newMotionPoint(newPosition);
        }
    }

    clearRenderInDevices(){
        console.log("clear render in devices");
        if (this.pathsDevices !== null){
            this.pathsDevices.forEach(path => {
                path.checkpoints.forEach(checkpoint => { this.groundPlaneContainerObj.remove(checkpoint); });
                this.groundPlaneContainerObj.remove(path.tubeLine);
            });
        }
    }

    updateDevices(data){

        this.clearRenderInDevices();
        this.pathsDevices = [];

        data.forEach(framePath => {                                                                                     // We go through array of paths

            this.pathsDevices.push(new Path(this.groundPlaneContainerObj, framePath.index, this.checkpointbaseFloating, this.checkpointbaseGrounded, this.dummy_anchor));

            framePath.checkpoints.forEach(frameCheckpoint => {

                this.pathsDevices[framePath.index].newCheckpointInDevices(new THREE.Vector3(frameCheckpoint.posX, frameCheckpoint.posY, frameCheckpoint.posZ), frameCheckpoint.orientation);
            });
            if (framePath.checkpoints.length > 1) this.pathsDevices[framePath.index].createTubeForDevices();
        });
    }

    getDeltaMouse(eventData){

        this.mouseCoordinates(eventData);

        if (this.firstEdit){
            this.previousMouseY = this.mouse.y;
            this.firstEdit = false;
        }

        let delta = this.mouse.y - this.previousMouseY;
        this.previousMouseY = this.mouse.y;

        return delta;

    }

    getRayFromMouse(eventData){

        this.mouseCoordinates(eventData);

        //2. Set the picking ray from the camera position and mouse coordinates
        this.raycaster.setFromCamera( this.mouse, this.camera );

        return this.raycaster.ray;

    }

    computeCameraHeightFromGroundPlane(){

        const l0 = this.camera.position;                                         // Camera is not moving: always at 0,0,0 - line origin

        let camdown = new THREE.Vector3();                                        // Normal to gp
        camdown.copy(this.groundPlaneContainerObj.up);
        camdown.transformDirection(this.groundPlaneContainerObj.matrixWorld);     // Plane normal in world coordinates
        camdown = camdown.multiplyScalar(-1);

        let p0 = new THREE.Vector3();
        this.groundPlaneContainerObj.getWorldPosition(p0);                       // point in plane

        let normal = new THREE.Vector3();                                   // Normal to plane
        normal.copy(this.groundPlaneContainerObj.up);
        normal.transformDirection(this.groundPlaneContainerObj.matrixWorld);     // Plane normal in world coordinates

        let v1 = new THREE.Vector3();
        v1.subVectors(p0, l0);

        const top = v1.dot(normal);
        const bottom = camdown.dot(normal);
        const d = top/bottom;

        let newPosition = camdown.multiplyScalar(d);
        newPosition.add(l0);                                                // Intersection between line and plane

        return this.camera.position.distanceTo(newPosition);
    }

    computeGroundPlaneIntersection(ray){

        // Formulas for line and plane intersection
        // plane: (p - p0) . n = 0
        // line: p = dl + l0
        // d = (p0 - l0) . n / l . n

        //3. Compute intersection from ray to ground plane
        const l0 = this.camera.position;                                         // Camera is not moving: always at 0,0,0 - line origin
        const l = ray.direction;                                  // line direction

        let p0 = new THREE.Vector3();
        this.groundPlaneContainerObj.getWorldPosition(p0);                       // point in plane

        let normal = new THREE.Vector3();                                   // Normal to plane
        normal.copy(this.groundPlaneContainerObj.up);
        normal.transformDirection(this.groundPlaneContainerObj.matrixWorld);     // Plane normal in world coordinates

        let v1 = new THREE.Vector3();
        v1.subVectors(p0, l0);

        const top = v1.dot(normal);
        const bottom = l.dot(normal);
        const d = top/bottom;

        let newPosition = l.multiplyScalar(d);
        newPosition.add(l0);                                                // Intersection between line and plane

        return newPosition;
    }

    checkpointReached(idx){
        if (idx + 1 < this.currentPath.checkpoints.length){
            this.currentPath.checkpoints[idx].deactivateNextAnimation();
            //this.currentPath.checkpoints[idx + 1].activateNextAnimation();
        } else if (idx + 1 === this.currentPath.checkpoints.length){
            this.currentPath.checkpoints[idx].deactivateNextAnimation();
        }
    }

    checkpointTriggered(idx){
        this.currentPath.checkpoints[idx].activateNextAnimation();
    }

    // Sets the mouse position with a coordinate system where the center of the screen is the origin
    mouseCoordinates(eventData){

        if (eventData === 0){
            this.mouse.x = 0;
            this.mouse.y = 0;
        } else {
            //1. Sets the mouse position with a coordinate system where the center of the screen is the origin
            this.mouse.x = ( eventData.x / window.innerWidth ) * 2 - 1;
            this.mouse.y = - ( eventData.y / window.innerHeight ) * 2 + 1;
        }

    }

    update() {

        this.renderer.render(this.scene, this.camera);  // RENDER SCENE!
        if(this.ringsMade) {
            this.J1.planeNumber.material.map.needsUpdate = true;
            this.J2.planeNumber.material.map.needsUpdate = true;
            this.J3.planeNumber.material.map.needsUpdate = true;
            this.J4.planeNumber.material.map.needsUpdate = true;
            this.J5.planeNumber.material.map.needsUpdate = true;
            this.J6.planeNumber.material.map.needsUpdate = true;
        }
        /*if(this.ringsMade) {
            this.scene.updateMatrixWorld();
            let quat = new THREE.Quaternion();
            let scale = new THREE.Vector3();
            let pos = new THREE.Vector3();
            this.J3World.set(0,0,0);
            this.temp = this.obj3.clone();
            this.obj3.parent.add(this.temp);
            while (this.temp.parent.name != "dummy_anchor") {
                this.temp.matrix.decompose(pos, quat, scale);
                this.J3World.add(pos);
                this.temp.parent.parent.add(this.temp);
                this.temp = this.temp.parent.clone();
            }
            //this.temp.matrix.decompose(pos,quat,scale);
            //this.J3World.add(pos);
            this.J3.position.copy(this.J3World); // Right place but rotates with camera
            //this.J3Rot.copy(this.camera.rotation);
            //this.J3.rotation.copy(this.scene.rotation);
        }*/

        /*
        // Surface Tracking Feedback
        let newRay = this.getRayFromMouse(0);
        let phonePointingAtfloorPosition = this.computeGroundPlaneIntersection(newRay);
        this.groundPlaneContainerObj.worldToLocal(phonePointingAtfloorPosition);
        this.dummy_phonePointer.position.copy(phonePointingAtfloorPosition);
         */

    }
}
