import React, { Component } from "react";
import { AppBar, Toolbar, Typography, Fab, Icon, Grid, Modal } from '@material-ui/core';
import { Exchange } from './components/Exchange/Exchange';
import ExchangeForm from './components/ExchangeForm/ExchangeForm';
import { requestConnection, addListener, removeListener } from "./services/socket";
import './App.scss';


export class App extends Component {
    state = {
        exchanges: [],
        modal_isOpen: false
    }


    eventHandler = evt_key => d => {
        const exchanges = JSON.parse(JSON.stringify(this.state.exchanges));
        const exchange = exchanges.find(ex => ex.evt_key == evt_key);
        exchange.data = d;
        this.setState({ exchanges });
        console.log(evt_key, '   ', d);
    }


    addRmqExchange = (server, exchange, routing_key) => {
        const evt_key = `rmq:${server}:${exchange}:${routing_key}`;
        addListener(evt_key, this.eventHandler(evt_key));
        const exchanges = [...this.state.exchanges];
        exchanges.push({ type: 'rmq', server, exchange, routing_key, evt_key, data: {} });
        this.setState({ exchanges });
    }


    addZmqExchange = server => {
        const evt_key = `zmq:${server}`;
        addListener(evt_key, this.eventHandler(evt_key));
        const exchanges = [...this.state.exchanges];
        exchanges.push({ type: 'zmq', server, evt_key, data: {} });
        this.setState({ exchanges });
    }


    removeExchange = evt_key => {
        removeListener(evt_key);
        const index = this.state.exchanges.findIndex(ex => ex.evt_key == evt_key);
        const exchanges = this.state.exchanges.slice();
        exchanges.splice(index, 1);
        this.setState({ exchanges });
    }


    openModal = () => { this.setState({ modal_isOpen: true }) }


    closeModal = () => { this.setState({ modal_isOpen: false }) }


    handleSubmit = d => {
        const exchange_found = this.state.exchanges.find(ex => ex.server === d.server && ex.exchange === d.exchange && ex.routing_key === d.routing_key);
        if (exchange_found) {
            alert('Already connected to this exchange');
        }
        else {
            console.log('sending request');
            requestConnection(d, res => {
                if (res.error) {
                    alert(res.error);
                    console.log('Server Error:', res.error);
                }
                else {
                    switch (d.type) {
                        case 'rmq':
                            this.addRmqExchange(d.server, d.exchange, d.routing_key);
                            break;
                        case 'zmq':
                            this.addZmqExchange(d.server);
                    }
                }
            }); 
        }
    }


    renderExchanges = () => {
        return this.state.exchanges.map((exchange, i) => (
            <Grid item xs={6} md={4} key={i}>
                <Exchange {...exchange} closeHandler={this.removeExchange}/>
            </Grid>
        ))
    }


    render() {
        const { modal_isOpen } = this.state;
        return (
            <div className='app'>
                <AppBar position="sticky" color="primary">
                    <Toolbar>
                        <Typography variant="h6" color="inherit">
                            Grand Exchange
                        </Typography>
                        <Fab color='secondary' className='add-btn' onClick={this.openModal}>
                            <Icon>add</Icon>
                        </Fab>
                    </Toolbar>
                </AppBar>
                <Modal open={modal_isOpen} onClose={this.closeModal}>
                    <ExchangeForm onSubmit={this.handleSubmit}></ExchangeForm>
                </Modal>
                <main>
                    <Grid container spacing={24} className='exchange-container'>
                        {this.renderExchanges()}
                    </Grid>
                </main>
            </div>
        )
    }
}