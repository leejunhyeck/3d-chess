'use client'
import styles from '../../public/css/chess.module.css'

import { Canvas, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from '@react-three/drei'
import React, {useEffect, useState, useRef} from 'react'
import * as THREE from 'three'
import { v4 as uuidv4} from 'uuid'

const colorConfig = {
    opacity : {
        black : 0.9,
        white : 0.4,
        normal : 1
    }
}

const mapConfig = {
    cellSize : {
        x : 5,
        y : 5,
        Gap : 7
    }
}

type piece = "KING" | "QUEEN" | "ROOKS" | "BISHOPS" | "KNIGHTS" | "PAWNS" | "NONE";

interface cell {
    readonly color: "white" | "black";
    piece: Unit | null;
    row: number;
    column: "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
    layer: number;
    ID: number
    visible: boolean
    mesh : THREE.Mesh,
    cubeMesh : THREE.Mesh,
    onUnit: boolean
    onUnitTeam: "white" | "black" | "none"
    canAttack: boolean
    canGo: boolean
    normalOpacity :number
}

class Cell implements cell{
    public column: "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
    public readonly color: "white" | "black";
    public mesh: THREE.Mesh; 
    public cubeMesh: THREE.Mesh;
    public onUnit;
    public canAttack;
    public canGo;
    public onUnitTeam: "white" | "black" | "none";
    public normalOpacity:number

    constructor(
        public piece : Unit | null,
        public row: number,
        columnNum:number,
        public layer: number,
        color:boolean,
        public ID:number,
        public visible:boolean
    ){
        switch(columnNum){
            case 1:
                this.column = "a";
                break;
            case 2:
                this.column = "b";
                break;
            case 3:
                this.column = "c";
                break;
            case 4:
                this.column = "d";
                break;
            case 5:
                this.column = "e"
                break;
            case 6:
                this.column = "f"
                break;
            case 7:
                this.column = "g"
                break;
            default:
                this.column = "h";
        }
        if(color){
            this.color = "white";
        }else{
            this.color = "black";
        }

        const geometry = new THREE.BoxGeometry(mapConfig.cellSize.x, mapConfig.cellSize.y);
        const material = new THREE.MeshBasicMaterial({
            color: this.color,
            side: THREE.DoubleSide,
        });
        this.mesh = new THREE.Mesh(geometry, material);

        this.mesh.rotation.x = Math.PI / 2;
        this.mesh.position.set(
            (this.getCol()*1.001) * mapConfig.cellSize.x - 15,
            (this.layer*1.001) * mapConfig.cellSize.Gap - 35,
            (this.row*1.001) * -mapConfig.cellSize.y + 15  
        );

        // CubeMesh

        const cubeMaterial = new THREE.MeshBasicMaterial({
            color : this.color,
            side : THREE.DoubleSide,
            transparent : true,
            opacity : 0.1
        })

        const cubeSideGeometry = new THREE.BoxGeometry(
            mapConfig.cellSize.x,
            mapConfig.cellSize.Gap - 1,
            mapConfig.cellSize.y
        )

        this.cubeMesh = new THREE.Mesh(cubeSideGeometry, cubeMaterial)

        this.cubeMesh.position.set(
            (this.getCol()*1.001) * mapConfig.cellSize.x - 15,
            this.layer * mapConfig.cellSize.Gap - 31.5,
            (this.row*1.001) * -mapConfig.cellSize.y + 15  
        );


        this.mesh.renderOrder = 1; // 바닥
        this.cubeMesh.renderOrder = 2; // 벽
        // 셀 데이터를 메쉬에 저장
        this.mesh.userData.cell = this;

        this.onUnit = false;
        this.canAttack = false;
        this.canGo = false;
        this.onUnitTeam = "none"
        this.normalOpacity = colorConfig.opacity.normal
    }

    getCol(){
        switch(this.column){
            case "a":
                return 1;
            case "b":
                return 2;
            case "c":
                return 3;
            case "d":
                return 4;
            case "e":
                return 5;
            case "f":
                return 6;
            case "g":
                return 7;
            default:
                return 8
        }
    }

    addToScene(scene: THREE.Scene, wallVisible:boolean) {
        console.log("wall to ",wallVisible)
        if(wallVisible){
            // const cubeMaterial = this.cubeMesh.material as Array<THREE.MeshBasicMaterial>;
            // for(let i = 0; i < 6; i++){
            //     cubeMaterial[i]
            // }

            scene.add(this.cubeMesh)
        }else{
            scene.remove(this.cubeMesh)
        }
        scene.add(this.mesh);
    }

    setVisible(visible: boolean) {
        this.visible = visible;
        const material = this.mesh.material as THREE.MeshBasicMaterial;
        material.transparent = true;
        material.opacity = visible ? this.normalOpacity : 0.1; // 투명도 설정

        // const cube_material = this.cubeMesh.material as Array<THREE.MeshBasicMaterial>;
        // for(let i = 0; i < 5; i++){
        //     if(i != 3){
        //         cube_material[i].side = THREE.FrontSide
        //     }else{
        //         cube_material[i].opacity = 0
        //     }
        // }

        const cube_material = this.cubeMesh.material as THREE.MeshBasicMaterial
        cube_material.opacity = visible ? 0.2 : 0.1
    }

    makeGoCell(showingCell:Array<Cell>){
        this.canGo = true;
        this.canAttack = false;
        const material = this.mesh.material as THREE.MeshBasicMaterial;
        material.transparent = true;
        this.normalOpacity = material.opacity = this.color == "black" ? colorConfig.opacity.black : colorConfig.opacity.white   
        material.color.set('yellow')

        // const cube_material = this.cubeMesh.material as Array<THREE.MeshBasicMaterial>;

        // for(let i = 0; i < 6; i++){    
        //     cube_material[i].transparent = true;
        //     cube_material[i].color.set('yellow');
        // }

        const cube_material = this.cubeMesh.material as THREE.MeshBasicMaterial
        cube_material.color.set('yellow')
        showingCell.push(this)
    }

    makeAttackCell(showingCell:Array<Cell>){
        this.makeGoCell(showingCell)
        this.canAttack = true;
        const material = this.mesh.material as THREE.MeshBasicMaterial;
        material.color.set('red')

        // const cube_material = this.cubeMesh.material as Array<THREE.MeshBasicMaterial>;

        // for(let i = 0; i < 6; i++){    
        //     cube_material[i].transparent = true;
        //     cube_material[i].color.set('red');
        // }

        const cube_material = this.cubeMesh.material as THREE.MeshBasicMaterial
        cube_material.color.set('red')
        showingCell.push(this)
    }
}
interface board {
    readonly cells: Array<Array<Cell>>;
    //layer == index
    layer : number;
}

class Board implements board{
    constructor(
        public cells:Array<Array<Cell>>,
        public layer:number
    ){}
}

////////////////////////////////////////////////////////

abstract class Unit{ // == piece ( 체스 기물 )
    public death:boolean;
    protected showingCell:Array<Cell> = []
    public model:THREE.Group;
    public turn:"white" | "black" = myTeam;
    constructor(
        public team: "white" | "black",
        public row: number,
        public column : "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h",
        public layer: number,
        public board:Array<Board>,
        public piece:piece,
        public wasHandled:boolean,
        public ID:string
    ){
        this.death = false;
        board[layer - 1].cells[row - 1][this.convertCol() - 1].onUnit = true;
        board[layer - 1].cells[row - 1][this.convertCol() - 1].onUnitTeam = team
        board[layer - 1].cells[row - 1][this.convertCol() - 1].piece = this
        this.model = new THREE.Group()
    }
    
    public abstract showCanCell():void;
    public abstract addToScene(scene: THREE.Scene):void;

    public unitUp(){
        const animeId = setInterval(() => {
            this.model.position.setY(this.model.position.y + 0.2)
        },10)
        setTimeout(() => {
            clearInterval(animeId)
        },150)
    }

    public unitDown(){
        this.model.position.set(this.convertCol() * mapConfig.cellSize.x -13,this.layer * mapConfig.cellSize.Gap - 34.5 + 0.01 + 3, this.row * -mapConfig.cellSize.y + 9)
        let tempCount = 3;
        const animeId = setInterval(() => {
            this.model.position.setY(this.layer * mapConfig.cellSize.Gap - 34.5 + 0.01 + tempCount)
            tempCount -= 0.2
        },10)
        setTimeout(() => {
            clearInterval(animeId)
        },150)
    }

    public hideCanCell(){
        this.showingCell.forEach(cell => {
            const tempMaterial = cell.mesh.material as THREE.MeshBasicMaterial;
            cell.canGo = false;
            cell.canAttack = false;
            cell.normalOpacity = colorConfig.opacity.normal;
            tempMaterial.opacity = colorConfig.opacity.normal;
            tempMaterial.color.set(`${cell.color}`)

            // const cube_tempMaterial = cell.cubeMesh.material as Array<THREE.MeshBasicMaterial>;
            // for(let i = 0; i < 6; i++){
            //     cube_tempMaterial[i].color.set(`${cell.color}`)
            // }

            const cube_tempMaterial = cell.cubeMesh.material as THREE.MeshBasicMaterial;
            cube_tempMaterial.color.set(`${cell.color}`)
        })
        this.showingCell = [];
    }

    public update(scene:THREE.Scene, window:Window){
        scene.remove(this.model)
        if(this.death){
            ////Temp
            myUnits = myUnits.filter((unit:Unit) => {
                return unit.ID != this.ID
            })
            if(this.piece == "KING"){
                console.log("Kill King")
                //setGameOver
                window.removeEventListener('click',clickHandler )
            }
            enemyUnits = enemyUnits.filter((unit:Unit) => {
                return unit.ID != this.ID
            })
        }else{        
            scene.add(this.model)
        }
    }

    async move(cell:Cell, scene:THREE.Scene){
        //현재 칸에 기물 정보 삭제 ( onUnit, onUnitTeam, piece)
        const nowCell = this.board[this.layer - 1].cells[this.row - 1][this.convertCol() - 1];
        nowCell.onUnit = false;
        nowCell.onUnitTeam = "none"
        nowCell.piece = null

        console.log(scene.add)

        if(cell.canAttack && cell.piece){
            cell.piece.death = true;
            console.log("Kill!!!")
            updateGame()
        }

        //이동한 칸에 기물 정보 추가
        cell.onUnit = true;
        cell.onUnitTeam = this.team;
        cell.piece = this;

        //이동 가능 칸 숨기기
        this.hideCanCell()
        //기물 옮기기 애니메이션
        const onceX = ( this.convertCol() - cell.getCol() ) / 30;
        const onceY = ( this.layer - cell.layer ) / 30;
        const onceZ = ( this.row - cell.row ) / 30;

        //내 위치 변경
        this.layer = cell.layer;
        this.row = cell.row;
        this.column = cell.column;
        
        const animeId = setInterval(() => {
            this.model.position.setX(this.model.position.x - onceX * mapConfig.cellSize.x)
            this.model.position.setY(this.model.position.y - onceY * mapConfig.cellSize.Gap - 0.0745)
            this.model.position.setZ(this.model.position.z + onceZ * mapConfig.cellSize.y)
        }, 10)

        setTimeout(() => {
            this.model.position.setX(this.convertCol() * mapConfig.cellSize.x - 13)
            this.model.position.setY(this.layer *  mapConfig.cellSize.Gap - 34.5 + 0.01)
            this.model.position.setZ(this.row * -mapConfig.cellSize.y + 9)
            clearInterval(animeId)
        }, 300)
        this.wasHandled = true;
    }

    public convertCol(){
        switch(this.column){
            case "a":
                return 1;
            case "b":
                return 2;
            case "c":
                return 3;
            case "d":
                return 4;
            case "e":
                return 5;
            case "f":
                return 6;
            case "g":
                return 7;
            default:
                return 8;
        }
    }

}

class Queen extends Unit {
    public wasHandled = false;
    private config = {};
    constructor(
        public team: "white" | "black",
        public row: number,
        public column : "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h",
        public layer: number,
        board: Array<Board>
    ){
        super(team,row,column,layer, board, "QUEEN", false, `${team}_BISHOPS_${uuidv4()}`)
    }

    public addToScene(scene: THREE.Scene): void {
        const loader = new GLTFLoader();
        loader.load(
            `/3D/QUEEN_${this.team}.glb`,
            (gltf) => {
                this.model = gltf.scene;
                this.model.position.set(this.convertCol() * mapConfig.cellSize.x -15 + 2,this.layer * mapConfig.cellSize.Gap - 34.5 + 0.01, this.row * -mapConfig.cellSize.y + 15 - 6)
                this.model.scale.set(0.4, 0.4, 0.4);
                this.model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.userData.type = 'units'; // 타입 설정
                        child.userData.unit = this;    // 현재 유닛 객체 저장
                    }
                });
                this.model.userData.type = 'units'
                this.model.userData.unit = this
                scene.add(this.model)
            }
        )
    }

    public showCanCell(): void {
        this.hideCanCell()
        
        const cells = this.board[this.layer - 1].cells
        for(let i = 1; i <= 8; i++){    //foward
            if(1 <= this.row + i && this.row + i <= 8){
                const cell = cells[this.row + i - 1][this.convertCol() - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){                
                    cell.makeGoCell(this.showingCell)
                }

            }
        }

        for(let i = 1; i <= 8; i++){    //backward
            if(1 <= this.row - i && this.row - i <= 8){
                const cell = cells[this.row - i - 1][this.convertCol() - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){                
                    cell.makeGoCell(this.showingCell)
                }

            }
        }

        for(let i = 1; i <= 8; i++){    //left
            if(1 <= this.convertCol() - i && this.convertCol()- i <= 8){
                const cell = cells[this.row - 1][this.convertCol() - i - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){
                    cell.makeGoCell(this.showingCell)
                }
                
            }
        }

        for(let i = 1; i <= 8; i++){    //right
            if(1 <= this.convertCol() +  i && this.convertCol() + i <= 8){
                const cell = cells[this.row - 1][this.convertCol() + i - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){
                    cell.makeGoCell(this.showingCell)
                }
            }
        }

        
        for(let i = 1; i <= 3; i++){    //Up
            if(1 <= this.layer + i && this.layer + i <= 3){
                const cell = this.board[this.layer + i - 1].cells[this.row - 1][this.convertCol() - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){
                    cell.makeGoCell(this.showingCell)
                }

            }
        }

                
        for(let i = 1; i <= 3; i++){    //Down
            if(1 <= this.layer - i && this.layer - i <= 3){
                const cell = this.board[this.layer - i - 1].cells[this.row - 1][this.convertCol() - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){
                    cell.makeGoCell(this.showingCell)
                }

            }
        }

        // X + Y
            for(let i = 1; i <= 8; i++){// 좌 상향
                if(this.row + i <= 8 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer -1].cells[this.row + i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 8; i++){// 좌 하향
                if(this.row - i >= 1 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer -1].cells[this.row - i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)    
                }
            }
            for(let i = 1; i <= 8; i++){// 우 상향
                if(this.row + i <= 8 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer -1].cells[this.row + i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)    
                }
            }
            for(let i = 1; i <= 8; i++){// 우 하향
                if(this.row - i >= 1 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer -1].cells[this.row - i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)    
                }
            }
        
         // X + Z
            for(let i = 1; i <= 3; i++){ // 우 상향
                if(this.layer + i <= 3 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer + i - 1].cells[this.row - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            
            for(let i = 1; i <= 3; i++){  // 우 하향
                if(this.layer - i >= 1 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer - i - 1].cells[this.row - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }

            for(let i = 1; i <= 3; i++){ //좌 하향
                if(this.layer - i >= 1 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer - i - 1].cells[this.row - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }

            for(let i = 1; i <= 3; i++){ // 좌 상향
                if(this.layer + i <= 3 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer + i - 1].cells[this.row - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
        
        // Y + Z
            for(let i = 1; i <= 3; i++){ // 우 상향
                if(this.layer + i <= 3 && this.row + i <= 8){
                    const cell = this.board[this.layer + i - 1].cells[this.row + i -1][this.convertCol() - 1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }

            for(let i = 1; i <= 3; i++){ // 우 하향
                if(this.layer - i >= 1 && this.row + i <= 8){
                    const cell = this.board[this.layer - i - 1].cells[this.row + i -1][this.convertCol() - 1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }

            for(let i = 1; i <= 3; i++){ // 좌 하향
                if(this.layer - i >= 1 && this.row - i >= 1){
                    const cell = this.board[this.layer - i - 1].cells[this.row - i -1][this.convertCol() - 1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }

            for(let i = 1; i <= 3; i++){ //좌 상향
                if(this.layer + i <= 3 && this.row - i >= 1){
                    const cell = this.board[this.layer + i - 1].cells[this.row - i -1][this.convertCol() - 1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
        
        //3차원
            for(let i = 1; i <= 3; i++){//  + + +
                if(this.layer + i <= 3 && this.row + i <= 8 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer + i -1].cells[this.row + i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 3; i++){// + + -
                if(this.layer + i <= 3 && this.row + i <= 8 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer + i -1].cells[this.row + i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 3; i++){// + - +
                if(this.layer + i <= 3 && this.row - i >= 1 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer + i -1].cells[this.row - i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 3; i++){// - + +
                if(this.layer - i >= 1 && this.row + i <= 8 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer - i -1].cells[this.row + i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// - - +
                if(this.layer - i >= 1 && this.row - i >= 1 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer - i -1].cells[this.row - i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// - + -
                if(this.layer - i >= 1 && this.row + i <= 8 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer - i -1].cells[this.row + i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// + - -
                if(this.layer + i <= 3 && this.row - i >= 1 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer + i -1].cells[this.row - i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// - - -
                if(this.layer - i >= 1 && this.row - i >= 1 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer - i -1].cells[this.row - i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
        
    }
}

class Bishops extends Unit {
    public wasHandled = false;
    private config = {}
    constructor(
        public team: "white" | "black",
        public row: number,
        public column : "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" ,
        public layer: number,
        board: Array<Board>
    ){        
        super(team,row,column,layer, board, "BISHOPS", false, `${team}_BISHOPS_${uuidv4()}`)
    }

    public addToScene(scene: THREE.Scene): void {
        const loader = new GLTFLoader();
        loader.load(
            `/3D/BISHOPS_${this.team}.glb`,
            (gltf) => {
                this.model = gltf.scene;
                this.model.position.set(this.convertCol() * mapConfig.cellSize.x -15 + 2,this.layer * mapConfig.cellSize.Gap - 34.5 + 0.01, this.row * -mapConfig.cellSize.y + 15 - 6)
                this.model.scale.set(0.4, 0.4, 0.4);
                this.model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.userData.type = 'units'; // 타입 설정
                        child.userData.unit = this;    // 현재 유닛 객체 저장
                    }
                });
                this.model.userData.type = 'units'
                this.model.userData.unit = this
                scene.add(this.model)
            }
        )
    }

    public showCanCell(): void {
        this.hideCanCell()
        // X + Y
            for(let i = 1; i <= 8; i++){// 좌 상향
                if(this.row + i <= 8 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer -1].cells[this.row + i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 8; i++){// 좌 하향
                if(this.row - i >= 1 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer -1].cells[this.row - i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)    
                }
            }
            for(let i = 1; i <= 8; i++){// 우 상향
                if(this.row + i <= 8 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer -1].cells[this.row + i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)    
                }
            }
            for(let i = 1; i <= 8; i++){// 우 하향
                if(this.row - i >= 1 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer -1].cells[this.row - i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)    
                }
            }
        
        //3차원
            for(let i = 1; i <= 3; i++){//  + + +
                if(this.layer + i <= 3 && this.row + i <= 8 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer + i -1].cells[this.row + i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 3; i++){// + + -
                if(this.layer + i <= 3 && this.row + i <= 8 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer + i -1].cells[this.row + i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 3; i++){// + - +
                if(this.layer + i <= 3 && this.row - i >= 1 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer + i -1].cells[this.row - i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 3; i++){// - + +
                if(this.layer - i >= 1 && this.row + i <= 8 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer - i -1].cells[this.row + i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// - - +
                if(this.layer - i >= 1 && this.row - i >= 1 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer - i -1].cells[this.row - i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// - + -
                if(this.layer - i >= 1 && this.row + i <= 8 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer - i -1].cells[this.row + i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// + - -
                if(this.layer + i <= 3 && this.row - i >= 1 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer + i -1].cells[this.row - i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// - - -
                if(this.layer - i >= 1 && this.row - i >= 1 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer - i -1].cells[this.row - i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
        
        
    }
}

class Rooks extends Unit {
    public wasHandled = false;
    private config = {};
    constructor(
        public team: "white" | "black",
        public row: number,
        public column : "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h",
        public layer: number,
        board: Array<Board>
    ){
        super(team,row,column,layer, board, "ROOKS", false, `${team}_ROOKS_${uuidv4()}`)
    }

    public addToScene(scene: THREE.Scene): void {
        const loader = new GLTFLoader();
        loader.load(
            `/3D/ROOKS_${this.team}.glb`,
            (gltf) => {
                this.model = gltf.scene;
                this.model.position.set(this.convertCol() * mapConfig.cellSize.x -15 + 2,this.layer * mapConfig.cellSize.Gap - 34.5 + 0.01, this.row * -mapConfig.cellSize.y + 15 - 6)
                this.model.scale.set(0.4, 0.4, 0.4);
                this.model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.userData.type = 'units'; // 타입 설정
                        child.userData.unit = this;    // 현재 유닛 객체 저장
                    }
                });
    
                scene.add(this.model)
            }
        )
    }

    public showCanCell(): void {
        this.hideCanCell()
        const cells = this.board[this.layer - 1].cells
        for(let i = 1; i <= 8; i++){    //foward
            if(1 <= this.row + i && this.row + i <= 8){
                const cell = cells[this.row + i - 1][this.convertCol() - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){                
                    cell.makeGoCell(this.showingCell)
                }

            }
        }

        for(let i = 1; i <= 8; i++){    //backward
            if(1 <= this.row - i && this.row - i <= 8){
                const cell = cells[this.row - i - 1][this.convertCol() - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){                
                    cell.makeGoCell(this.showingCell)
                }

            }
        }

        for(let i = 1; i <= 8; i++){    //left
            if(1 <= this.convertCol() - i && this.convertCol()- i <= 8){
                const cell = cells[this.row - 1][this.convertCol() - i - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){
                    cell.makeGoCell(this.showingCell)
                }
                
            }
        }

        for(let i = 1; i <= 8; i++){    //right
            if(1 <= this.convertCol() +  i && this.convertCol() + i <= 8){
                const cell = cells[this.row - 1][this.convertCol() + i - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){
                    cell.makeGoCell(this.showingCell)
                }
            }
        }

        
        for(let i = 1; i <= 3; i++){    //Up
            if(1 <= this.layer + i && this.layer + i <= 3){
                const cell = this.board[this.layer + i - 1].cells[this.row - 1][this.convertCol() - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){
                    cell.makeGoCell(this.showingCell)
                }

            }
        }

                
        for(let i = 1; i <= 3; i++){    //Down
            if(1 <= this.layer - i && this.layer - i <= 3){
                const cell = this.board[this.layer - i - 1].cells[this.row - 1][this.convertCol() - 1];
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit) {
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                        break;
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                    break;
                }
                if(cell.canGo){
                    cell.makeGoCell(this.showingCell)
                }

            }
        }

        {//3차원
            for(let i = 1; i <= 3; i++){//  + + +
                if(this.layer + i <= 3 && this.row + i <= 8 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer + i -1].cells[this.row + i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 3; i++){// + + -
                if(this.layer + i <= 3 && this.row + i <= 8 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer + i -1].cells[this.row + i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 3; i++){// + - +
                if(this.layer + i <= 3 && this.row - i >= 1 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer + i -1].cells[this.row - i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
            for(let i = 1; i <= 3; i++){// - + +
                if(this.layer - i >= 1 && this.row + i <= 8 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer - i -1].cells[this.row + i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// - - +
                if(this.layer - i >= 1 && this.row - i >= 1 && this.convertCol() + i <= 8){
                    const cell = this.board[this.layer - i -1].cells[this.row - i - 1][this.convertCol() + i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// - + -
                if(this.layer - i >= 1 && this.row + i <= 8 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer - i -1].cells[this.row + i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// + - -
                if(this.layer + i <= 3 && this.row - i >= 1 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer + i -1].cells[this.row - i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
    
            for(let i = 1; i <= 3; i++){// - - -
                if(this.layer - i >= 1 && this.row - i >= 1 && this.convertCol() - i >= 1){
                    const cell = this.board[this.layer - i -1].cells[this.row - i - 1][this.convertCol() - i -1];
                    if(cell.onUnit){
                        if(cell.onUnitTeam != this.team){
                            cell.makeAttackCell(this.showingCell)
                        }
                        break;
                    }
                    cell.makeGoCell(this.showingCell)
                }
            }
        }
    }
}

class King extends Unit{
    
    public wasHandled = false;
    private config = {
        moving : {
            points : [
                // 같은 계층
                [1,0,0],
                [-1,0,0],
                [0,0,1],
                [0,0,-1],
                [1,0,1],
                [1,0,-1],
                [-1,0,1],
                [-1,0,-1],

                // 한 계층 위
                [0,1,0],
                [1,1,0],
                [-1,1,0],
                [0,1,1],
                [0,1,-1],
                [1,1,1],
                [1,1,-1],
                [-1,1,1],
                [-1,1,-1],

                //한 계층 아래
                [0,-1,0],
                [1,-1,0],
                [-1,-1,0],                
                [0,-1,1],
                [0,-1,-1],
                [1,-1,1],
                [1,-1,-1],
                [-1,-1,1],
                [-1,-1,-1],
            ]
        }
    }
    constructor(
        public team: "white" | "black",
        public row: number,
        public column : "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h",
        public layer: number,
        board: Array<Board>
    ){
        super(team,row,column,layer, board, "KING", false, `${team}_KING_${uuidv4()}`)
    }

    public addToScene(scene: THREE.Scene): void {
        const loader = new GLTFLoader();
        loader.load(
            `/3D/KING_${this.team}.glb`,
            (gltf) => {
                this.model = gltf.scene;
                this.model.position.set(this.convertCol() * mapConfig.cellSize.x -15 + 2,this.layer * mapConfig.cellSize.Gap - 34.5 + 0.01, this.row * -mapConfig.cellSize.y + 15 - 6)
                this.model.scale.set(0.4, 0.4, 0.4)
                this.model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.userData.type = 'units'; // 타입 설정
                        child.userData.unit = this;    // 현재 유닛 객체 저장
                    }
                });
                this.model.userData.type = 'units'
                this.model.userData.unit = this
                scene.add(this.model)
            }
        )
    }

    public showCanCell(): void {
        this.hideCanCell()
        this.config.moving.points.forEach(goTo => {
            const goFoward = this.row + goTo[2] -1;
            const goLR = this.convertCol() + goTo[0] -1;
            const goLayer = this.layer + goTo[1] -1;

            if(( 0 <= goFoward && goFoward <= 7) && ( 0 <= goLR && goLR <= 7 ) && ( 0 <= goLayer && goLayer <= 2)){
                const cells = this.board[goLayer].cells
                const cell = cells[goFoward][goLR];
                
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true;
                if(cell.onUnit){
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                }
                if(cell.canGo && !cell.canAttack){
                    cell.makeGoCell(this.showingCell)
                }
            }
        })
    }
}

class Knights extends Unit{

    public wasHandled = false;
    private config = {
        moving : {
            points : [
                [1,0,-2],
                [-1,0,-2],
                [2,0,-1],
                [2,0,1],
                
                [-2,0,-1],
                [-2,0,1],
                [1,0,2],
                [-1,0,2],

                [1,-2,0],
                [-1,-2,0],
                [0,-2,1],
                [0,-2,-1],

                [1,2,0],
                [-1,2,0],
                [0,2,1],
                [0,2,-1],

                [-2,1,0],
                [2,1,0],
                [0,1,-2],
                [0,1,2],

                [-2,-1,0],
                [2,-1,0],
                [0,-1,2],
                [0,-1,-2]
            ]
        }
    }
    constructor(
        public team: "white" | "black",
        public row: number,
        public column : "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h",
        public layer: number,
        board: Array<Board>
    ){
        super(team,row,column,layer, board, "KNIGHTS", false, `${team}_KNIGHTS_${uuidv4()}`)
    }

    public addToScene(scene: THREE.Scene): void {
        const loader = new GLTFLoader();
        loader.load(
            `/3D/KNIGHTS_${this.team}.glb`,
            (gltf) => {
                this.model = gltf.scene;
                this.model.position.set(this.convertCol() * mapConfig.cellSize.x -15 + 2,this.layer * mapConfig.cellSize.Gap - 34.5 + 0.01, this.row * -mapConfig.cellSize.y + 15 - 6)
                this.model.scale.set(0.4, 0.4, 0.4);
                this.model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.userData.type = 'units'; // 타입 설정
                        child.userData.unit = this;    // 현재 유닛 객체 저장
                    }
                });
                this.model.userData.type = 'units'
                this.model.userData.unit = this
                scene.add(this.model)
            }
        )
    }

    public showCanCell(): void {
        this.hideCanCell()
        this.config.moving.points.forEach(goTo => {
            const goFoward = this.row + goTo[2] -1;
            const goLR = this.convertCol() + goTo[0] -1;
            const goLayer = this.layer + goTo[1] -1;

            if(( 0 <= goFoward && goFoward <= 7) && ( 0 <= goLR && goLR <= 7 ) && ( 0 <= goLayer && goLayer <= 2)){
                const cells = this.board[goLayer].cells
                const cell = cells[goFoward][goLR];
                
                const material = cell.mesh.material as THREE.MeshBasicMaterial;
                material.color.set('yellow')
                cell.canGo = true
                if(cell.onUnit){
                    console.log(`someCell has Unit, that is ${cell.onUnitTeam} and myTeam is ${this.team}`)
                    if(cell.onUnitTeam != this.team){
                        cell.makeAttackCell(this.showingCell)
                    }else{
                        cell.canGo = false;
                        material.color.set(cell.color)
                    }
                }
                if(cell.canGo && !cell.canAttack){
                    cell.makeGoCell(this.showingCell)
                }
            }
        })
    }
}

class Pawns extends Unit{
    public wasHandled = false;
    constructor(
        public team: "white" | "black",
        public row: number,
        public column : "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h",
        public layer: number,
        board: Array<Board>
    ){
        super(team,row,column,layer, board, "PAWNS", false, `${team}_PAWNS_${uuidv4()}`)
    }

    public addToScene(scene: THREE.Scene): void {
        const loader = new GLTFLoader();
        loader.load(
            `/3D/PAWNS_${this.team}.glb`,
            (gltf) => {
                this.model = gltf.scene;
                this.model.position.set(this.convertCol() * mapConfig.cellSize.x -15 + 2,this.layer * mapConfig.cellSize.Gap - 34.5 + 0.01, this.row * -mapConfig.cellSize.y + 15 - 6)
                this.model.scale.set(0.4,0.4,0.4);
                this.model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.userData.type = 'units'; // 타입 설정
                        child.userData.unit = this;    // 현재 유닛 객체 저장
                    }
                });
                this.model.userData.type = 'units'
                this.model.userData.unit = this
                scene.add(this.model)
            }
        )
    }
    public showCanCell(){
        this.hideCanCell()
        //base
        const thisLayer = this.board[this.layer -1].cells;
        if(this.team == "white" && this.row <= 7){
            let upLayer = null;
            let upLayer2 = null;
            let downLayer =null
            if(this.layer > 1){
                downLayer = this.board[this.layer-2].cells;
            }
            if(this.layer < 3){
                upLayer = this.board[this.layer].cells;
            }
            if(this.layer == 1){
                upLayer2 = this.board[this.layer + 1].cells;
            }

            if(downLayer != null && !downLayer[this.row][this.convertCol() -1].onUnit){
                downLayer[this.row][this.convertCol() -1].makeGoCell(this.showingCell)
            }

            if(downLayer != null && !downLayer[this.row-1][this.convertCol() -1].onUnit){
                downLayer[this.row-1][this.convertCol() -1].makeGoCell(this.showingCell)
            }

            if(!thisLayer[this.row][this.convertCol() -1].onUnit){
                thisLayer[this.row][this.convertCol() -1].makeGoCell(this.showingCell)
                if(!this.wasHandled && !thisLayer[this.row + 1][this.convertCol() -1].onUnit){
                    thisLayer[this.row + 1][this.convertCol() -1].makeGoCell(this.showingCell)
                }
            }
            if(upLayer != null && !upLayer[this.row-1][this.convertCol() -1].onUnit){
                upLayer[this.row-1][this.convertCol() -1].makeGoCell(this.showingCell)
                if(!this.wasHandled && upLayer2 != null && !upLayer2[this.row-1][this.convertCol() -1].onUnit){
                    upLayer2[this.row -1][this.convertCol() -1].makeGoCell(this.showingCell)
                }
            }
            if(upLayer != null && !upLayer[this.row][this.convertCol() -1].onUnit){
                upLayer[this.row][this.convertCol() -1].makeGoCell(this.showingCell)
                if(!this.wasHandled && upLayer2 != null && !upLayer2[this.row + 1][this.convertCol() -1].onUnit){
                    upLayer2[this.row + 1][this.convertCol() -1].makeGoCell(this.showingCell)
                }
            }

            if(this.convertCol() != 1){
                console.log(thisLayer[this.row][this.convertCol() -2])
                if(thisLayer[this.row][this.convertCol() -2].onUnit && thisLayer[this.row][this.convertCol() -2].onUnitTeam != this.team){
                    thisLayer[this.row][this.convertCol()-2].makeAttackCell(this.showingCell)
                }
                if(upLayer != null && upLayer[this.row][this.convertCol() -2].onUnit && upLayer[this.row][this.convertCol() -2].onUnitTeam != this.team){
                    upLayer[this.row][this.convertCol() -2].makeAttackCell(this.showingCell)
                }
                if(downLayer != null && downLayer[this.row][this.convertCol() -2].onUnit && downLayer[this.row][this.convertCol() -2].onUnitTeam != this.team){
                    downLayer[this.row][this.convertCol() -2].makeAttackCell(this.showingCell)
                }
            }

            if(this.convertCol() != 8){
                if(thisLayer[this.row][this.convertCol()].onUnit && thisLayer[this.row][this.convertCol()].onUnitTeam != this.team){
                    thisLayer[this.row][this.convertCol()].makeAttackCell(this.showingCell)
                }
                if(upLayer != null && upLayer[this.row][this.convertCol()].onUnit && upLayer[this.row][this.convertCol()].onUnitTeam != this.team){
                    upLayer[this.row][this.convertCol()].makeAttackCell(this.showingCell)
                }
                if(downLayer != null && downLayer[this.row][this.convertCol()].onUnit && downLayer[this.row][this.convertCol()].onUnitTeam != this.team){
                    downLayer[this.row][this.convertCol()].makeAttackCell(this.showingCell)
                }
            }
        }else if(this.team == "black" && this.row >= 2){
            let downLayer =null
            let downLayer2 = null;
            let upLayer = null;
            if(this.layer < 3){
                upLayer = this.board[this.layer].cells;
            }

            if(this.layer > 1){
                downLayer = this.board[this.layer-2].cells;
            }
            if(this.layer == 3){
                downLayer2 = this.board[this.layer -3].cells;
            }

            if(upLayer != null && !upLayer[this.row-1][this.convertCol() -1].onUnit){
                upLayer[this.row-1][this.convertCol() -1].makeGoCell(this.showingCell)
            }

            if(upLayer != null && !upLayer[this.row -2][this.convertCol() -1].onUnit){
                upLayer[this.row -2][this.convertCol() -1].makeGoCell(this.showingCell)
            }
            
            if(!thisLayer[this.row-2][this.convertCol() -1].onUnit){
                thisLayer[this.row-2][this.convertCol() -1].makeGoCell(this.showingCell)
                if(!this.wasHandled && !thisLayer[this.row-3][this.convertCol() -1].onUnit){
                    thisLayer[this.row - 3][this.convertCol() -1].makeGoCell(this.showingCell)
                }
            }
            if(downLayer != null && !downLayer[this.row-1][this.convertCol() -1].onUnit){
                downLayer[this.row-1][this.convertCol() -1].makeGoCell(this.showingCell)
                if(!this.wasHandled && downLayer2 !=null && !downLayer2[this.row -1][this.convertCol() -1].onUnit){
                    downLayer2[this.row -1][this.convertCol() -1].makeGoCell(this.showingCell)
                }
            }
            if(downLayer != null && !downLayer[this.row-2][this.convertCol() -1].onUnit){
                downLayer[this.row-2][this.convertCol() -1].makeGoCell(this.showingCell)
                if(!this.wasHandled && downLayer2 != null && !downLayer2[this.row - 3][this.convertCol() -1].onUnit){
                    downLayer2[this.row -3][this.convertCol() -1].makeGoCell(this.showingCell)
                }
            }

            if(this.convertCol() != 1){
                console.log(thisLayer[this.row -2][this.convertCol() -2])
                if(thisLayer[this.row-2][this.convertCol() -2].onUnit && thisLayer[this.row-2][this.convertCol() -2].onUnitTeam != this.team){
                    thisLayer[this.row-2][this.convertCol()-2].makeAttackCell(this.showingCell)
                }
                if(upLayer != null && upLayer[this.row-2][this.convertCol() -2].onUnit && upLayer[this.row-2][this.convertCol() -2].onUnitTeam != this.team){
                    upLayer[this.row-2][this.convertCol() -2].makeAttackCell(this.showingCell)
                }
                
                if(downLayer != null && downLayer[this.row-2][this.convertCol() -2].onUnit && downLayer[this.row-2][this.convertCol() -2].onUnitTeam != this.team){
                    downLayer[this.row-2][this.convertCol() -2].makeAttackCell(this.showingCell)
                }
            }

            if(this.convertCol() != 8){
                
                console.log(thisLayer[this.row -2][this.convertCol()])
                console.log(myTeam)
                if(thisLayer[this.row-2][this.convertCol()].onUnit && thisLayer[this.row-2][this.convertCol()].onUnitTeam != this.team){
                    thisLayer[this.row-2][this.convertCol()].makeAttackCell(this.showingCell)
                }
                if(upLayer != null && upLayer[this.row-2][this.convertCol()].onUnit && upLayer[this.row-2][this.convertCol()].onUnitTeam != this.team){
                    upLayer[this.row-2][this.convertCol()].makeAttackCell(this.showingCell)
                }
                if(downLayer != null && downLayer[this.row-2][this.convertCol()].onUnit && downLayer[this.row-2][this.convertCol()].onUnitTeam != this.team){
                    downLayer[this.row-2][this.convertCol()].makeAttackCell(this.showingCell)
                }
            }
        }

    }

    async move(cell:Cell, scene:THREE.Scene){
            if(this.team == myTeam && cell.row == 8 && cell.layer == 3){
                myUnits = myUnits.filter((unit:Unit) => {
                    return unit.ID != this.ID
                })
                myUnits.push(new Queen(myTeam, this.row, this.column, this.layer, this.board))
                
            updateGame()
            }else if(this.team != myTeam && cell.row == 1 && cell.layer == 1){
                enemyUnits = myUnits.filter((unit:Unit) => {
                    return unit.ID != this.ID
                })
                enemyUnits.push(new Queen(myTeam, this.row, this.column, this.layer, this.board))   
                
            updateGame() 
            }
    
            //현재 칸에 기물 정보 삭제 ( onUnit, onUnitTeam, piece)
            const nowCell = this.board[this.layer - 1].cells[this.row - 1][this.convertCol() - 1];
            nowCell.onUnit = false;
            nowCell.onUnitTeam = "none"
            nowCell.piece = null
    
            if(cell.canAttack && cell.piece){
                cell.piece.death = true;
                console.log("Kill!!!")
                updateGame()
            }
    
            //이동한 칸에 기물 정보 추가
            cell.onUnit = true;
            cell.onUnitTeam = this.team;
            cell.piece = this;
    
            //이동 가능 칸 숨기기
            this.hideCanCell()
            //기물 옮기기 애니메이션
            const onceX = ( this.convertCol() - cell.getCol() ) / 30;
            const onceY = ( this.layer - cell.layer ) / 30;
            const onceZ = ( this.row - cell.row ) / 30;
    
            //내 위치 변경
            this.layer = cell.layer;
            this.row = cell.row;
            this.column = cell.column;
            
            const animeId = setInterval(() => {
                this.model.position.setX(this.model.position.x - onceX * mapConfig.cellSize.x)
                this.model.position.setY(this.model.position.y - onceY * mapConfig.cellSize.Gap - 0.0745)
                this.model.position.setZ(this.model.position.z + onceZ * mapConfig.cellSize.y)
            }, 10)
    
            setTimeout(() => {
                this.model.position.setX(this.convertCol() * mapConfig.cellSize.x - 13)
                this.model.position.setY(this.layer *  mapConfig.cellSize.Gap - 35 + 0.01)
                this.model.position.setZ(this.row * -mapConfig.cellSize.y + 9)
                clearInterval(animeId)

                if(this.team == myTeam && cell.row == 8 && cell.layer == 3){
                    myUnits = myUnits.filter((unit:Unit) => {
                        return unit.ID != this.ID
                    })
                    scene.remove(this.model)
                    const newObj = new Queen(myTeam, 8 , this.column, 3, this.board)
                    newObj.addToScene(scene)
                    myUnits.push(newObj)
                }else if(this.team != myTeam && cell.row == 1 && cell.layer == 1){
                    enemyUnits = myUnits.filter((unit:Unit) => {
                        return unit.ID != this.ID
                    })
                    scene.remove(this.model)
                    const newObj = new Queen(myTeam, 1, this.column, 1, this.board)
                    newObj.addToScene(scene);
                    enemyUnits.push(newObj)
                }
            }, 300)
            this.wasHandled = true;
        }

}
////////////////////////////////////////////////////////

interface space {
    readonly boards: Array<Board>
}

class Space implements space {
    public readonly boards;

    constructor(
        public scene:THREE.Scene
    ) {
        let cellID = 1;
        let isWhite = true;
        const Boards = [];

        for (let layer = 1; layer <= 3; layer++) {
            const rows: Array<Array<Cell>> = [];

            for (let row = 1; row <= 8; row++) {
                const columns: Array<Cell> = [];

                for (let column = 1; column <= 8; column++) {
                    console.log(`layer : ${layer}, row : ${row}, column : ${column}`)
                    columns.push(new Cell(null, row, column, layer, isWhite, cellID++, true));
                    isWhite = !isWhite;
                }
                isWhite = !isWhite;
                rows.push(columns);
            }
            
            isWhite = !isWhite;
            Boards.push(new Board(rows, layer));
        }

        this.boards = Boards;
        console.log(this.boards)
    }

    public showWall(){

   } 

    public addToScene(wallVisible:boolean) {
        this.boards.forEach(board => {
            board.cells.forEach(rows => {
                rows.forEach(cell => {
                    cell.addToScene(this.scene, wallVisible);
                });
            });
        });
    }

    public setAllVisible(visible: boolean){
        this.boards.forEach(board => {
            board.cells.forEach(rows => {
                rows.forEach(cell => {
                    cell.setVisible(visible)
                })
            })
        })
    }
}

let myUnits:any = []
let enemyUnits:any = [];
const myTeam: "white" | "black" = 'white'
let turn: "white" | "black" = myTeam;
let selUnit:unknown = null;
let updateGame:() => void;
let clickHandler:(event:MouseEvent) => void;
function ThreeBoard({spaceRef, /*turn, setTurn,*/ wallVisible} : {spaceRef: React.MutableRefObject<Space | null>, /*turn:"white" | "black", setTurn:React.Dispatch<React.SetStateAction<"white" | "black">>, */wallVisible:boolean}) {
    const { scene, camera } = useThree();

    const changeNumToCol = (columnNum:number) => {
        switch(columnNum){
            case 1:
                return "a";
            case 2:
                return "b";
            case 3:
                return "c"
            case 4:
                return "d"
            case 5:
                return "e"
            case 6:
                return "f"
            case 7:
                return "g"
            default:
                return "h"
        }
    }

    useEffect(() => {

        turn = myTeam;
        const gameSpace = new Space(scene);
        spaceRef.current = gameSpace;
        gameSpace.addToScene(wallVisible);

        const initGame = () =>{
            for(let i = 1; i <= 8; i++){
                console.log("white팀 폰", i)
                myUnits.push(new Pawns(myTeam, 2, changeNumToCol(i), 1, gameSpace.boards))
            }
                                      
            myUnits.push(new Rooks(   myTeam, 1, "a", 1, gameSpace.boards))
            myUnits.push(new Knights( myTeam, 1, "b", 1, gameSpace.boards))
            myUnits.push(new Bishops( myTeam, 1, "c", 1, gameSpace.boards))
            myUnits.push(new Queen(   myTeam, 1, "d", 1, gameSpace.boards))
            myUnits.push(new King(    myTeam, 1, "e", 1, gameSpace.boards))
            myUnits.push(new Bishops( myTeam, 1, "f", 1, gameSpace.boards))
            myUnits.push(new Knights( myTeam, 1, "g", 1, gameSpace.boards))
            myUnits.push(new Rooks(   myTeam, 1, "h", 1, gameSpace.boards))

            myUnits.forEach((unit: any) => {
                unit.addToScene(scene)
            })

            for(let i = 1; i <= 8; i++){
                enemyUnits.push(new Pawns(myTeam=="white" ? "black" : "white", 7, changeNumToCol(i), 3, gameSpace.boards))
            }

            enemyUnits.push(new Rooks(   myTeam=="white" ? "black" : "white", 8, "a", 3, gameSpace.boards))
            enemyUnits.push(new Knights( myTeam=="white" ? "black" : "white", 8, "b", 3, gameSpace.boards))
            enemyUnits.push(new Bishops( myTeam=="white" ? "black" : "white", 8, "c", 3, gameSpace.boards))
            enemyUnits.push(new Queen(   myTeam=="white" ? "black" : "white", 8, "d", 3, gameSpace.boards))
            enemyUnits.push(new King(    myTeam=="white" ? "black" : "white", 8, "e", 3, gameSpace.boards))
            enemyUnits.push(new Bishops( myTeam=="white" ? "black" : "white", 8, "f", 3, gameSpace.boards))
            enemyUnits.push(new Knights( myTeam=="white" ? "black" : "white", 8, "g", 3, gameSpace.boards))
            enemyUnits.push(new Rooks(   myTeam=="white" ? "black" : "white", 8, "h", 3, gameSpace.boards))

            enemyUnits.forEach((unit: any) => {
                unit.addToScene(scene)
            })
        }

        initGame()

        updateGame = () => {
            myUnits.forEach((unit:Unit) => {
                unit.update(scene, window)
            })
            enemyUnits.forEach((unit:Unit) => {
                unit.update(scene, window)
            })
        }

        clickHandler = (event: MouseEvent) => {
            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObjects(scene.children);

            if (intersects.length > 0) {
                if(event.button == 0) {//좌클릭
                    for(let i = 0; i < intersects.length; i++){
                        if(intersects[i].object.userData.type == 'units' && intersects[i].object.userData.unit.team == turn){
                            if(selUnit instanceof Unit){ //unknown type Unit으로 변환, == 기존에 잡은 유닛이 있다면,
                                selUnit.hideCanCell()
                                selUnit.unitDown()
                            }
                            const unit = intersects[i].object.userData.unit;
                            if(selUnit != unit){        //다른 유닛 잡기             
                                unit.showCanCell();
                                unit.unitUp();
                                selUnit = unit;
                            }else{ // 잡기 취소
                                unit.unitDown();
                                unit.hideCanCell();
                                selUnit = null;
                            }
                            break;
                        }else if(intersects[i].object.userData?.cell instanceof Cell){
                            const cellData: Cell = intersects[i].object.userData.cell;
                            console.log(cellData)
                            if(cellData.canGo){
                                console.log("Can Move!!")
                                console.log(selUnit)
                                if(selUnit instanceof Unit){
                                    selUnit.move(cellData, scene)
                                    turn = turn == "white" ? "black" : "white"
                                    //setTurn(turn != "white" ? "black" : "white")
                                }
                                selUnit = null;
                            }/////////////////////////////////////////////////////////////////////////////////////////////////////////
                            else if(cellData.onUnit && cellData.piece instanceof Unit && cellData.piece.team == turn){
                                if(selUnit instanceof Unit){ //unknown type Unit으로 변환, == 기존에 잡은 유닛이 있다면,
                                    selUnit.hideCanCell()
                                    selUnit.unitDown()
                                }
                                const unit = cellData.piece;
                                if(unit != null){
                                    if(selUnit != unit){        //다른 유닛 잡기             
                                        unit.showCanCell();
                                        unit.unitUp();
                                        selUnit = unit;
                                    }else{ // 잡기 취소
                                        unit.unitDown();
                                        selUnit = null;
                                    }
                                }
                                break;
                            }
                            // else if(cellData.visible){
                            //     cellData.setVisible(false)
                            //     break;
                            // }
                        }
                    }
                }else if(event.button == 2){
                    for(let i = intersects.length - 1; i >=0; i--){
                        if(intersects[i].object.userData?.cell instanceof Cell){
                            const cellData: Cell = intersects[i].object.userData.cell;
                            if(!cellData.visible){
                                intersects[i].object.userData.cell.setVisible(true)
                                break;
                            }
                        }
                    }
                }
            }
        };
        //const disableContextMenu = (event: MouseEvent) => event.preventDefault();
        document.addEventListener("mousedown", clickHandler);
        //document.addEventListener("contextmenu", disableContextMenu);

        camera.position.set(0,50,0);
        camera.lookAt(0, 0, 0);

        return () => {
            document.removeEventListener("click", clickHandler);
        };
    }, [camera,scene,spaceRef,wallVisible]);

    return null;
}

export default function Chess(){

    const spaceRef = useRef<Space | null>(null);
    const [visible, setVisible] = useState(true);
    const [wallVisible, setWallVisible] = useState(false)
   // const [turn, setTurn] = useState<"white"|"black">(myTeam);

    useEffect(() => {
        if(spaceRef.current){
            spaceRef.current.setAllVisible(visible)
            spaceRef.current.addToScene(wallVisible)
        }

    },[turn, visible, wallVisible])

    return (
        <div className={styles.WRAP}>
            <Canvas className={styles.SPACE}>

                {/** temp */}
                <directionalLight position={[0,100,0]}></directionalLight>
                <directionalLight position={[0,-100,0]}></directionalLight>
                <directionalLight position={[-100,-14,0]}></directionalLight>
                <directionalLight position={[100,-14,0]}></directionalLight>
                <directionalLight position={[0,-14,-100]}></directionalLight>
                <directionalLight position={[0,-14,100]}></directionalLight>

    
                {/** Code */}
                <OrbitControls 
                    mouseButtons={{
                        LEFT: THREE.MOUSE.LEFT,
                        MIDDLE: THREE.MOUSE.MIDDLE,
                        RIGHT: THREE.MOUSE.RIGHT, // 우클릭 방지
                    }}
                />
                <ThreeBoard spaceRef={spaceRef} /*turn={turn} setTurn={setTurn}*/ wallVisible={wallVisible}/>
            
            </Canvas>
            <div className={styles.UI} style={{color:'white'}}>
                    <input
                        type="checkbox"
                        checked={visible}
                        onChange={(e) => setVisible(e.target.checked)}
                    /><br />
                    <div>show Wall <input type="checkbox"
                        checked={wallVisible}
                        onChange={(e) => setWallVisible(e.target.checked)}
                     /> </div>
                    <div id="showTurn">{turn}</div>
            </div>
        </div>
    )
}