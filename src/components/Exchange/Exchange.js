import React, { Component } from 'react';
import { Fab, Button, Icon, Typography, Link } from "@material-ui/core";
import { ToggleButtonGroup } from '@material-ui/lab';
import { renderjson } from '../../lib/renderjson/renderjson';
import moment from "moment";
import './Exchange.scss';


export class Exchange extends Component {
    state = {
        level: 1,
        isPaused: false,
        isClosed: false
    };

    json_ref = React.createRef();
    

    shouldComponentUpdate = (next_props, next_state) => {
        return !(this.state.isPaused && next_state.isPaused || this.state.isClosed && next_state.isClosed) || this.state.level != next_state.level;
    }


    componentDidUpdate = (prev_props, prev_state) => {
        const new_data = JSON.stringify(this.props.data) !== JSON.stringify(prev_props.data);
        const new_level = this.state.level !== prev_state.level;
        if (new_data || new_level) {
            //console.log('exchange updated', this.props);
            const old_child = this.json_ref.current.firstElementChild;
            const new_child = renderjson.set_icons('chevron_right', 'expand_more').set_show_to_level(this.state.level)(this.props.data.content)
            //console.log('new json view constructed')
            this.json_ref.current.replaceChild(new_child, old_child);
        }
    }


    updateLevel = new_level => { this.setState({ level: new_level }) }

    upGradeLevel = () => {
        let depth = this.getdepth(this.props.data.content) - 1;
        let level = this.state.level;
        if(depth > level) this.setState({ level: level + 1 });
        
    }

    downGradeLevel = () => {
        let level = this.state.level;
        if(level > 0) this.setState({ level: level - 1 });
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
    
    renderHeading = _ => {
        switch (this.props.type) {
            case 'rmq':
                const { server, exchange, routing_key } = this.props;
                return (
                    <div className='exchange-title'>
                        <Typography variant='h5' className='exchange-name'>
                            <Link
                                color='secondary'
                                href={`http://${server}:15672/#/exchanges/%2F/${exchange}`}
                                target='blank'>{exchange + (routing_key ? ' (' + routing_key + ')' : '')}
                            </Link>
                        </Typography>
                        <Typography variant='subtitle1' className='server'>
                            <Link
                                color='secondary'
                                href={`http://${server}:15672`}
                                target='blank'>{server}
                            </Link>                                            
                        </Typography>                                                 
                    </div>
                    );
            case 'zmq':
                return (
                    <div className='exchange-title'>
                        <Typography color='secondary' variant='h5' className='exchange-name'>{this.props.server}</Typography>
                    </div>
                );
            case 'mqtt':
                return (
                    <div className='exchange-title'>
                        <Typography color='secondary' variant='h5' className='exchange-name'>{this.props.topic}</Typography>
                        <Typography color='secondary' variant='subtitle1' className='server'>{this.props.server}</Typography>                                                 
                    </div>
                )
        }
    }

    render() {
        const { type, data = {} } = this.props;
        const { isPaused, isClosed } = this.state;
        return (
            <div className={'exchange ' + type}>
                <div className='heading'>
                    <Fab color='default' className='close-btn' size='small' onClick={this.closeHandler}>
                        <Icon>close</Icon>
                    </Fab>
                    <ToggleButtonGroup className='lvl-button-group'>
                        <Button className='btn' onClick={this.downGradeLevel}>
                            <Icon>remove</Icon>
                        </Button>
                        <Button className='btn' onClick={this.upGradeLevel}>
                            <Icon>add</Icon>
                        </Button>          
                    </ToggleButtonGroup>
                    <span className="typeName">{this.props.type}</span>                   
                    {this.renderHeading()}              
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