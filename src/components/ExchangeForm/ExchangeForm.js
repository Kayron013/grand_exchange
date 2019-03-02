import React, { Component } from "react";
import { FormControl, FormControlLabel, RadioGroup, Radio } from '@material-ui/core';
import { RmqForm } from './RmqForm/RmqForm';
import { ZmqForm } from './ZmqForm/ZmqForm';
import { MqttForm } from './MqttForm/MqttForm';
import './ExchangeForm.scss';

export class ExchangeForm extends Component {
    state = {
        form: 'rmq'
    }

    toggleForm = evt => {
        this.setState({ form: evt.target.value });
    }

    renderForm = _ => {
        switch (this.state.form) {
            case 'rmq':
                return <RmqForm onSubmit={this.props.onSubmit} />
            case 'zmq':
                return <ZmqForm onSubmit={this.props.onSubmit} />
            case 'mqtt':
                return <MqttForm onSubmit={this.props.onSubmit} />
        }
    }

    render() {
        return (
            <div className='exchange-form'>
                {this.renderForm()}
                <div className='form-select'>
                    <RadioGroup row className='radio-group' value={this.state.form} onChange={this.toggleForm}>
                        <FormControlLabel value='rmq' control={<Radio />} label='RMQ' />
                        <FormControlLabel value='zmq' control={<Radio />} label='ZMQ' />
                        <FormControlLabel value='mqtt' control={<Radio />} label='MQTT' />
                    </RadioGroup>
                </div>
            </div>
        )
    }
}