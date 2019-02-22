import React, { Component } from 'react';
import { Fab, Button, Icon, Typography, Link } from "@material-ui/core";
import { renderjson } from '../../lib/renderjson/renderjson';
import moment from "moment";
import { addListener, removeListener } from "../../services/socket";
import './Exchange.scss';


export class Exchange extends Component {
    state = {
        data: {},
        level: 2,
        isPaused: false,
        isClosed: false
    };

    json_ref = React.createRef();

    eventHandler = (d) => {
        if (!this.state.isPaused) this.setState(state => ({ data: d }));
    }

    componentDidMount = () => {
        const event_key = `${this.props.server}:${this.props.exchange}:${this.props.routing_key || ''}`;
        addListener(event_key, this.eventHandler);
    }

    componentDidUpdate = () => {
        const old_child = this.json_ref.current.firstElementChild;
        const new_child = renderjson.set_icons('chevron_right','expand_more').set_show_to_level(this.state.level)(this.state.data.content)
        this.json_ref.current.replaceChild(new_child, old_child);
    }

    componentWillUnmount = () => {
        removeListener(this.props.exchange, this.eventHandler);
    }

    updateLevel = (new_level) => { this.setState(state => ({ level: new_level })) }

    togglePlayback = () => { this.setState(state => ({ isPaused: !state.isPaused })) }

    toggleWindow = () => { this.setState(state => ({ isClosed: !state.isClosed })) }
    
    closeHandler = () => {
        this.props.closeHandler(this.props.server, this.props.exchange, this.props.routing_key);
    }

    isEmpty = obj => Object.values(obj).length;
    

    render() {
        const { exchange, server, routing_key } = this.props;
        const { isPaused, isClosed, data } = this.state;
        return (
            <div className='exchange'>
                <div className='heading'>
                    <Fab color='default' className='close-btn' size='small' onClick={this.closeHandler}>
                        <Icon>close</Icon>
                    </Fab>
                    <Typography variant='h5' className='exchange-name'>
                        <Link color='secondary' href={`#`} target='blank'>{exchange + (routing_key ? ' (' +routing_key+ ')' : '')}</Link>
                    </Typography>
                    <Typography variant='subtitle1' className='server'>
                        <Link color='secondary' href={`http://${server}`} target='blank'>{server}</Link>
                    </Typography>
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