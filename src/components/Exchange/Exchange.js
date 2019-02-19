import React, { Component } from 'react';
import { Fab, Button, Icon, Typography, Link } from "@material-ui/core";
import { renderjson } from '../../lib/renderjson/renderjson';
import moment from "moment";
import { addListener, removeListener, emitEvent } from "../../services/socket";
import './Exchange.scss';


export class Exchange extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: '',
            level: 1,
            isPaused: false,
            isClosed: false
        };
        this.json_ref = React.createRef();
        this.eventHandler = this.eventHandler.bind(this);
    }

    eventHandler(d) {
        if (!this.state.isPaused) this.setState(state => ({ data: d }));
    }

    componentDidMount() {
        addListener(this.props.exchange, this.eventHandler);
    }

    // shouldComponentUpdate(next_props, next_state) {
    //     if (this.state.isPaused) return !next_state.isPaused
    //     return true;
    // }

    componentDidUpdate() {
        const old_child = this.json_ref.current.firstElementChild;
        const new_child = renderjson.set_show_to_level(this.props.level)(this.state.data.content)
        this.json_ref.current.replaceChild(new_child, old_child);
    }

    componentWillUnmount() {
        removeListener(this.props.exchange, this.eventHandler);
    }

    updateLevel(new_level) { this.setState(state => ({ level: new_level })) }

    togglePlayback() { this.setState(state => ({ isPaused: !state.isPaused })) }

    toggleWindow() { this.setState(state => ({ isClosed: !state.isClosed })) }
    
    closeHandler() {
        this.props.closeHandler(this.props.server, this.props.exchange);
    }
    

    render() {
        const { exchange, server } = this.props;
        const { isPaused, isClosed, data } = this.state;
        return (
            <div className='exchange'>
                <div className='heading'>
                    <Fab color='default' className='close-btn' size='small' onClick={this.closeHandler.bind(this)}>
                        <Icon>close</Icon>
                    </Fab>
                    <Typography variant='h5' className='exchange-name'>
                        <Link color='secondary' href={`#`} target='blank'>{exchange}</Link>
                    </Typography>
                    <Typography variant='subtitle1' className='server'>
                        <Link color='secondary' href={`http://${server}`} target='blank'>{server}</Link>
                    </Typography>
                </div>
                <div className='window'>
                    <div className={'json' + (isClosed ? ' closed' : '')} ref={this.json_ref}><div className='target-child'></div></div>
                    <div className='footer'>
                        <Button
                            variant='contained' 
                            color='primary' 
                            className='btn'
                            onClick={this.togglePlayback.bind(this)}>
                            <Icon>{isPaused ? 'play_arrow' : 'pause'}</Icon>
                        </Button>
                        <div
                            className='last-received'
                            onClick={this.toggleWindow.bind(this)}>
                            Last Message Received:
                            <br />
                            {data ? moment(data.timestamp).format('hh:mm:ss a, MMM DD') : ''}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}