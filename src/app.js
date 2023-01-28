const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const { Op, json } = require('sequelize');
const httpStatus = require('http-status');
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

//This API is broken 😵! it should return the contract only if it belongs to the profile calling. better fix that!
app.get('/contracts/:id', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models');
    const { id } = req.params;
    const profileId = req.get('profile_id');
    let where = {
        [Op.or]: {
            ClientId: profileId,
            ContractorId: profileId
        },
        [Op.and]: {
            id: id
        }
    };
    const contract = await Contract.findOne({where: where});
    if(!contract) return res.status(404).end();
    res.json(contract);
})


// Returns a list of contracts belonging to a user (client or contractor),
// the list should only contain non terminated contracts
app.get('/contracts/', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models');
    const profileId = req.get('profile_id');
    console.log("p", profileId)
    let where = {
        [Op.or]: {
            ClientId: profileId,
            ContractorId: profileId
        },
        status: {
            [Op.ne]: 'terminated'
        }
    };
    const contract = await Contract.findAll({where: where});
    if(!contract) return res.status(404).end();
    res.json(contract);
})


//Get all unpaid jobs for a user (***either*** a client or contractor), for ***active contracts only

app.get('/jobs/unpaid', getProfile, async(req,res) => {
    const { Job, Contract } = req.app.get('models');
    const profileId = req.get('profile_id');
    let where = {
        paid: {
            [Op.or]: [null, false]
        }
    };
    let include = [{
        model: Contract,
        where: {
            [Op.or]: {
                ClientId: profileId,
                ContractorId: profileId
            },
            status: {
                [Op.oq]: 'in_progress'
            }
        },
        required: true
    }]
    const job = await Job.findAll({where:where, include:include})
    if(!job) return res.status(404).end()
    res.json(job)
})




// Returns the profession that earned the most money (sum of jobs paid) 
//missing error handling
app.get('/admin/best-profession', async (req, res) => {
    const { Job, Contract, Profile } = req.app.get('models');
    const { startDate, endDate } = req.query;
    const sequelize = req.app.get('sequelize');
    const bestProfessions = await Profile.findAll({
        attributes: ['profession', [sequelize.fn('SUM', sequelize.col('price')), 'earned']],
        include: [
          {
            model: Contract,
            as: 'Contractor',
            attributes: [],
            required: true,
            include: [
              {
                model: Job,
                required: true,
                attributes: [],
                where: {
                  paid: true,
                  paymentDate: {
                    [Op.gte]: startDate,
                    [Op.lte]: endDate,
                  },
                },
              },
            ],
          },
        ],
        where: {
          type: 'contractor',
        },
        group: ['profession'],
        order: [[sequelize.col('earned'), 'DESC']],
        limit: 1,
        subQuery: false,
    });

    if(bestProfessions.length <= 0) {
        res.status(httpStatus.NOT_FOUND).json({message: "best profession empty"})
    } else {
        res.status(httpStatus.OK).json(bestProfessions)
    }
})

module.exports = app;
