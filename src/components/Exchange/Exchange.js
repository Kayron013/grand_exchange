import React, { Component } from 'react';
import { Fab, Button, Icon, Typography, Link ,remove,add} from "@material-ui/core";
import { renderjson } from '../../lib/renderjson/renderjson';
import moment from "moment";
import { addListener, removeListener } from "../../services/socket";
import './Exchange.scss';


export class Exchange extends Component {
    state = {
        level: 1,
        isPaused: false,
        isClosed: false
    };

    //data = this.props.

    json_ref = React.createRef();
    

    shouldComponentUpdate = (next_props, next_state) => {
        return !(this.state.isPaused && next_state.isPaused) || this.state.level != next_state.level || !(this.state.isClosed && next_state.isClosed);
    }


    componentDidUpdate = (prev_props, prev_state) => {
        const new_data = JSON.stringify(this.props.data) !== JSON.stringify(prev_props.data);
        const unpaused = prev_state.isPaused && !this.state.isPaused;
        const new_state = this.state !== prev_state;
        if (new_data || unpaused || new_state) {
            console.log('exchange updated', this.props);
            const old_child = this.json_ref.current.firstElementChild;
            const new_child = renderjson.set_icons('chevron_right', 'expand_more').set_show_to_level(this.state.level)(this.props.data.content)
            this.json_ref.current.replaceChild(new_child, old_child);
        }
    }


    updateLevel = new_level => { this.setState(state => ({ level: new_level })) }

    upGradeLevel = () => {
        let depth = this.getdepth(this.props.data.content) - 1;
        let level = this.state.level;
        level = depth > level ? level + 1 : depth;
        this.setState({ level });
    }

    downGradeLevel = () => {
        let level = this.state.level;
        level = level == 0 ? level : level - 1;
        this.setState({ level });
    }

    getdepth = object => {
        let level = 1;
        let key;
        for(key in object) {
            // if (!object.hasOwnProperty(key)) continue;

            if(typeof object[key] == 'object'){
                let depth = this.getdepth (object[key]) + 1;
                level = Math.max(depth, level);
            }
        }
        return level;
    }

    togglePlayback = () => { this.setState(state => ({ isPaused: !state.isPaused })) }


    toggleWindow = () => { this.setState(state => ({ isClosed: !state.isClosed })) }
    

    closeHandler = () => {
        this.props.closeHandler(this.props.evt_key);
    }

    
    isEmpty = obj => !Object.values(obj).length;
    

    render() {
        const { exchange, server, routing_key, data = {} } = this.props;
        const { isPaused, isClosed } = this.state;
        return (
            <div className='exchange'>
                <div className='heading'>
                    <Fab color='default' className='close-btn' size='small' onClick={this.closeHandler}>
                        <Icon>close</Icon>
                    </Fab>
                    <Typography variant='h5' className='exchange-name'>
                        <Link color='secondary' href={`http://${server}:15672/#/exchanges/%2F/${exchange}`} target='blank'>{exchange + (routing_key ? ' (' +routing_key+ ')' : '')}</Link>
                    </Typography>
                    <Fab color='default' className='add-button' size='small' onClick={this.upGradeLevel} >
                        <Icon>add</Icon>
                    </Fab>
                    <Typography variant='subtitle1' className='server'>
                        <Link color='secondary' href={`http://${server}:15672`} target='blank'>{server}</Link>
                    </Typography>
                    <Fab color='default' className='substract-button' size='small' onClick={this.downGradeLevel}>
                        <Icon>remove</Icon>
                    </Fab>                    
                </div>
                <div className='window'>
                    <div className={'json' + (isClosed ? ' closed' : '')} ref={this.json_ref}>
                        <div className='target-child'></div>
                    </div>
                    <div className='footer'>
                        <Button
                            variant='contained' 
                            color='primary' 
                            className='btn'
                            onClick={this.togglePlayback}>
                            <Icon>{isPaused ? 'play_arrow' : 'pause'}</Icon>
                        </Button>
                        <div
                            className='last-received'
                            onClick={this.toggleWindow}>
                            Last Message Received:
                            <br />
                            {this.isEmpty(data) ? '' : moment(data.timestamp).format('hh:mm:ss a, MMM DD')}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}