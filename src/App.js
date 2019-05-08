import React, { Component } from "react";
import { AppBar, Toolbar, Typography, Fab, Icon, Grid, Modal } from '@material-ui/core';
import { Exchange } from './components/Exchange/Exchange';
import { ExchangeForm } from './components/ExchangeForm/ExchangeForm';
import { requestConnection, addListener, removeListener, sendHeartbeat } from "./services/socket";
import './App.scss';


export class App extends Component {
    state = {
        exchanges: [],
        modal_isOpen: false
    }

    componentDidMount = () =>
        setInterval(_ => {
            const connections = this.state.exchanges.map(ex => ({ type: ex.type, server: ex.server }));
            sendHeartbeat(connections);
        }, 900000);


    eventHandler = evt_key => d => {
        const exchanges = JSON.parse(JSON.stringify(this.state.exchanges));
        const exchange = exchanges.find(ex => ex.evt_key == evt_key);
        exchange.data = d;
        this.setState({ exchanges });
    }


    addRmqExchange = (server, exchange, routing_key, evt_key) => {
        addListener(evt_key, this.eventHandler(evt_key));
        const exchanges = [...this.state.exchanges];
        exchanges.push({ type: 'rmq', server, exchange, routing_key, evt_key, data: {} });
        this.setState({ exchanges });
    }


    addZmqExchange = (server, port, evt_key) => {
        addListener(evt_key, this.eventHandler(evt_key));
        const exchanges = [...this.state.exchanges];
        exchanges.push({ type: 'zmq', server, port, evt_key, data: {} });
        this.setState({ exchanges });
    }

    addMqttExchange = (server, port, topic, evt_key) => {
        addListener(evt_key, this.eventHandler(evt_key));
        const exchanges = [...this.state.exchanges];
        exchanges.push({ type: 'mqtt', server, port, topic, evt_key, data: {} });
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

    exchangeExists = d => {
        switch (d.exchange_type) {
            case 'rmq':
                return this.state.exchanges.find(ex => ex.server === d.server && ex.exchange === d.exchange && ex.routing_key === d.routing_key);
            case 'zmq':
                return this.state.exchanges.find(ex => ex.server === d.server && ex.port === d.port);
            case 'mqtt':
                return this.state.exchanges.find(ex => ex.server === d.server && ex.topic === d.topic);
        }
    }

    handleSubmit = d => {
        if (this.exchangeExists(d)) {
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
                    console.log('Response:', res);
                    switch (d.exchange_type) {
                        case 'rmq':
                            this.addRmqExchange(d.server, d.exchange, d.routing_key, res.event_key);
                            break;
                        case 'zmq':
                            this.addZmqExchange(d.server, d.port, res.event_key);
                            break;
                        case 'mqtt':
                            this.addMqttExchange(d.server, d.port, d.topic, res.event_key);
                    }
                }
            }); 
        }
    }


    renderExchanges = () => {
        return this.state.exchanges.map((exchange, i) => (
            <Grid item xs={12} md={4} key={i}>
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