import React, { Component } from 'react';
import { TextField, InputAdornment, Icon, IconButton, Typography, Button, FormControlLabel, Checkbox, RadioGroup, Radio } from '@material-ui/core';
import './RmqForm.scss';


export class RmqForm extends Component {
    state = {
        server: '',
        exchange: '',
        routing_key: '',
        is_durable: false,
        type: 'fanout',
        username: '',
        password: '',
        show_password: false,
        //record if the all necessary textfiled has been click
        touched: {
            server: false,
            exchange: false,
            username:false,
            password: false,
            type: false
      }
    }

    handleChange = field => evt => {
        evt.persist();
        this.setState({ [field]: evt.target.value });
    }

    handleBlur = field => evt => {
        this.setState({
         touched: { ...this.state.touched, [field]: true }
        });
    };

    toggleShowPassword = evt => {
        this.setState(state => ({ show_password: !state.show_password }));
    }

    handleSubmit = (event) =>{
        if (!this.canBeSubmitted()) {
            this.setState({
                touched: {
                    server: true,
                    exchange: true,
                    username: true,
                    password: true,
                    type: true
                }
            });
            alert("Fill out all required fields");
        }
        else {
            this.props.onSubmit({ ...this.state, exchange_type: 'rmq' });
        }

    } 

    handleEnter = (e)=>{
        // console.log(e.charCode);
        if(e.charCode==13){
            this.handleSubmit(e);  
        }
             
    }

    //check all necessary textfiled has been filled
    validate(server, exchange, username, password) {
         // true means invalid, so our conditions got reversed
        return {
            server: server.length === 0,
            exchange: exchange.length === 0,
            username: username.length === 0,
            password: password.length === 0,
        };
    }

    //check if the form has completed
    canBeSubmitted() {
        const errors = this.validate(this.state.server, this.state.exchange,this.state.username,this.state.password);
        const isDisabled = Object.keys(errors).some(x => errors[x]);
        return !isDisabled;
    }

    //check if the specific textfiled should be mark "error" 
    shouldMarkError = field => {
        const errors = this.validate(this.state.server, this.state.exchange,this.state.username,this.state.password);
        const hasError = errors[field];
        const shouldShow = this.state.touched[field];
        return hasError ? shouldShow : false;
    };

    render() {
        const { server, exchange, routing_key, is_durable, username, password, show_password } = this.state;
        // const errors = this.validate(this.state.server, this.state.exchange,this.state.username,this.state.password);
        // const isDisabled = Object.keys(errors).some(x => errors[x]);
        return (
            <form className='rmq-form' onKeyPress={this.handleEnter} >
                <Typography variant='h6' className='form-heading'>Exchange Route</Typography>
                <div className="form-group">
                    <TextField
                        id='server-name'
                        label='Server'
                        className='form-input'
                        value={server}
                        onChange={this.handleChange('server')}
                        variant='outlined'
                        error= {this.shouldMarkError("server") ? true : false}
                        onBlur={this.handleBlur("server")}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>public</Icon></InputAdornment>,
                        }}
                    />
                    <TextField
                        id='exchange-name'
                        label='Exchange'
                        className='form-input'
                        value={exchange}
                        onChange={this.handleChange('exchange')}
                        variant='outlined'
                        error= {this.shouldMarkError("exchange") ? true : false}
                        onBlur={this.handleBlur("exchange")}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>inbox</Icon></InputAdornment>,
                        }}
                    />
                    <TextField
                        id='route-key'
                        label='Route Key (optional)'
                        className='form-input'
                        value={routing_key}
                        onChange={this.handleChange('routing_key')}
                        variant='outlined'
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>pageview</Icon></InputAdornment>
                        }}
                    />
                </div>
                <Typography variant='h6' className='form-heading'>Exchange Type</Typography>
                <div className='form-group'>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={is_durable}
                                onChange={_ => this.setState(state => ({ is_durable: !state.is_durable }))}
                                color='primary'
                            />
                        }
                        label='Durable'
                    />
                    <RadioGroup row className='radio-group' value={this.state.type} onChange={this.handleChange('type')} onBlur={this.handleBlur('type')}>
                        <FormControlLabel value='fanout' control={<Radio />} label='Fanout' />
                        <FormControlLabel value='direct' control={<Radio />} label='Direct' />
                        <FormControlLabel value='topic' control={<Radio />} label='Topic' />
                    </RadioGroup>
                </div>
                <Typography variant='h6' className='form-heading'>Server Credentials</Typography>
                <div className="form-group">
                    <TextField
                        id='username'
                        label='Username'
                        className='form-input'
                        value={username}
                        onChange={this.handleChange('username')}
                        variant='outlined'
                        error= {this.shouldMarkError("username") ? true : false}
                        onBlur={this.handleBlur("username")}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>person</Icon></InputAdornment>
                        }}
                    />
                    <TextField
                        id='password'
                        label='Password'
                        className='form-input'
                        type={show_password ? 'text' : 'password'}
                        value={password}
                        onChange={this.handleChange('password')}
                        variant='outlined'
                        error= {this.shouldMarkError("password") ? true : false}
                        onBlur={this.handleBlur("password")}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>vpn_key</Icon></InputAdornment>,
                            endAdornment:
                                <InputAdornment position="end">
                                  <IconButton
                                    aria-label="Toggle password visibility"
                                    onClick={this.toggleShowPassword}
                                  >
                                    {show_password ? <Icon>visibility</Icon> : <Icon>visibility_off</Icon>}
                                  </IconButton>
                                </InputAdornment>
                        }}
                    />
                </div>
                <div className='submit-area'>
                    <Button type="button" color='secondary' variant='contained' onClick={this.handleSubmit}>Connect</Button>
                </div>
            </form>
        )
    }
}