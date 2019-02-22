import React, { Component } from 'react';
import { Paper, TextField, InputAdornment, Icon, IconButton, Typography, Button, FormControlLabel, Checkbox } from '@material-ui/core';
import './ExchangeForm.scss';


export class ExchangeForm extends Component {
    state = {
        server: '',
        exchange: '',
        routing_key: '',
        is_durable: false,
        username: '',
        password: '',
        show_password: false
    }

    handleChange = field => evt => {
       
        evt.persist();
        this.setState(state => ({ [field]: evt.target.value }));
    }

    toggleShowPassword = evt => {
        this.setState(state => ({ show_password: !state.show_password }));
    }

    handleSubmit = (event) =>{
        //  event.preventDefault();
         this.props.onSubmit(this.state);
         return false;
    } 
    handleEnter = (e)=>{
        // console.log(e.charCode);
        if(e.charCode==13){
            this.props.onSubmit(this.state);    
        }
             
    }

    render() {
        const { server, exchange, routing_key, is_durable, username, password, show_password } = this.state;
        return (
            <form className='exchange-form' tabIndex={-1} onKeyPress={this.handleEnter} >
                <Typography variant='h6' className='form-heading'>Exchange Route</Typography>
                <div className="exchange-input">
                    <TextField
                        id='server-name'
                        label='Server'
                        className='form-input'
                        value={server}
                        onChange={this.handleChange('server')}
                        variant='outlined'
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
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={is_durable}
                                onChange={_ => this.setState(state => ({ is_durable: !state.is_durable }))}
                                color='primary'
                            />
                        }
                        label='Exchange is Durable'
                    />
                </div>
                <Typography variant='h6' className='form-heading'>Server Credentials</Typography>
                <div className="exchange-input">
                    <TextField
                        id='username'
                        label='Username'
                        className='form-input'
                        value={username}
                        onChange={this.handleChange('username')}
                        variant='outlined'
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