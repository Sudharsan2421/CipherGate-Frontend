import React, { Fragment, useRef, useState, useEffect, useContext, useCallback } from 'react';
import { FaDownload, FaPlus, FaExclamationTriangle, FaCalendarAlt, FaTrash, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Webcam from "react-webcam";
import jsQR from "jsqr";
import appContext from '../../context/AppContext';
import { toast } from 'react-toastify';
import { putAttendance, getAttendance } from '../../services/attendanceService';
import { getWorkers } from '../../services/workerService';
import Table from '../common/Table';
import Spinner from '../common/Spinner';
import { Link, useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../../hooks/useAxios';
import { getAuthToken } from '../../utils/authUtils';
import FaceAttendance from './FaceAttendance';

const AttendanceManagement = () => {
    const [worker, setWorker] = useState({ rfid: "" });
    const [qrText, setQrText] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
    const [attendanceData, setAttendanceData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchName, setSearchName] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterRfid, setFilterRfid] = useState('');
    const webcamRef = useRef(null);
    const inputRef = useRef(null);
    const [isPunching, setIsPunching] = useState(false);
    const [batches, setBatches] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [isLoadingBatches, setIsLoadingBatches] = useState(true);
    const [isBatchPopupOpen, setIsBatchPopupOpen] = useState(false);
    const [batchEmployees, setBatchEmployees] = useState([]);
    const [isFetchingBatchEmployees, setIsFetchingBatchEmployees] = useState(false);
    const [batchSearchTerm, setBatchSearchTerm] = useState('');

    const { subdomain } = useContext(appContext);
    const [confirmAction, setConfirmAction] = useState(null);
    const navigate = useNavigate();

    const uniqueRfids = React.useMemo(() => {
        return [...new Set(attendanceData.map(record => record.rfid).filter(rfid => rfid && rfid.trim() !== ''))];
    }, [attendanceData]);

    const handleSubmit = e => {
        e.preventDefault();
        if (!subdomain || subdomain === 'main') {
            toast.error('Subdomain not found, check the URL.');
            return;
        }
        if (!worker.rfid.trim()) {
            toast.error('Enter the RFID');
            return;
        }
        let next = 'Punch In';
        const recs = attendanceData.filter(r => r.rfid === worker.rfid);
        if (recs.length) {
            const last = recs
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            next = last.presence ? 'Punch Out' : 'Punch In';
        }
        setConfirmAction(next);
    };

    const handleCancel = () => setConfirmAction(null);

    const handleConfirm = () => {
        setIsPunching(true);
        putAttendance({ rfid: worker.rfid, subdomain })
            .then(res => {
                toast.success(res.message || 'Attendance marked successfully!');
                setWorker({ rfid: '' });
                setConfirmAction(null);
                fetchAttendanceData();
            })
            .catch(err => {
                console.error(err);
                // Handle 429 Too Many Requests error (2-minute interval enforcement)
                if (err.response?.status === 429) {
                    toast.error(err.response.data.message || 'Please wait before punching again.');
                } else {
                    toast.error(err.message || 'Failed to mark attendance.');
                }
            })
            .finally(() => {
                setIsPunching(false);
            });
    };

    const fetchSettings = async () => {
        if (!subdomain || subdomain === 'main') {
            setIsLoadingBatches(false);
            return;
        }
        setIsLoadingBatches(true);
        try {
            const token = getAuthToken();
            const response = await api.get(`/settings/${subdomain}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const settingsData = response.data;
            const safeBatchesData = settingsData?.batches && Array.isArray(settingsData.batches) ? settingsData.batches : [];
            setBatches(safeBatchesData);
        } catch (error) {
            console.error('Error fetching settings for batches:', error);
            toast.error('Failed to load batch data.');
            setBatches([]);
        } finally {
            setIsLoadingBatches(false);
        }
    };

    const handleBatchChange = async (e) => {
        const batchName = e.target.value;
        setSelectedBatch(batchName);

        if (!batchName) {
            setIsBatchPopupOpen(false);
            return;
        }

        setIsBatchPopupOpen(true);
        setBatchSearchTerm('');
        setIsFetchingBatchEmployees(true);
        try {
            const allWorkers = await getWorkers({ subdomain });
            if (Array.isArray(allWorkers)) {
                const employeesInBatch = allWorkers.filter(worker => worker.batch === batchName);
                setBatchEmployees(employeesInBatch);
            } else {
                setBatchEmployees([]);
            }
        } catch (error) {
            toast.error(`Failed to fetch employees for batch ${batchName}.`);
            setBatchEmployees([]);
        } finally {
            setIsFetchingBatchEmployees(false);
        }
    };

    const handleEmployeeClick = (workerId) => {
        navigate(`/admin/attendance/${workerId}`);
        setIsBatchPopupOpen(false);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            scanQRCode();
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isModalOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isModalOpen]);

    useEffect(() => {
        if (isModalOpen && !confirmAction && inputRef.current) {
            inputRef.current.focus();
        }
    }, [confirmAction, isModalOpen]);

    const scanQRCode = () => {
        if (webcamRef.current) {
            const video = webcamRef.current.video;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext("2d");

                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, canvas.width, canvas.height);

                if (code) {
                    setQrText(code.data);
                    console.log("QR Code Data:", code.data);
                    setWorker({ ...worker, rfid: code.data });
                }
            }
        }
    };

    const fetchAttendanceData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAttendance({ subdomain });
            // Remove large console.log to prevent React warnings
            setAttendanceData(Array.isArray(data.attendance) ? data.attendance : []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch attendance data.");
        } finally {
            setIsLoading(false);
        }
    }, [subdomain]);

    useEffect(() => {
        if (subdomain && subdomain !== 'main') {
            fetchAttendanceData();
            fetchSettings();
        }
    }, [subdomain, fetchAttendanceData]);

    const filteredAttendance = attendanceData.filter(record => {
        const matchesName = !searchName || record?.name?.toLowerCase().includes(searchName.toLowerCase());
        const matchesDepartment = !filterDepartment || record?.departmentName?.toLowerCase().includes(filterDepartment.toLowerCase());
        const matchesDate = !filterDate || (record.date && record.date.startsWith(filterDate));
        const matchesRfid = !filterRfid || record?.rfid?.toLowerCase().includes(filterRfid.toLowerCase());
        return matchesName && matchesDepartment && matchesDate && matchesRfid;
    });

    const processedAttendance = processAttendanceByDay(filteredAttendance);

    const filteredBatchEmployees = batchEmployees.filter(employee =>
        employee.name.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
        (employee.rfid && employee.rfid.toLowerCase().includes(batchSearchTerm.toLowerCase()))
    );

    function processAttendanceByDay(attendanceData) {
        function parseTime12hToSeconds(timeStr) {
            if (typeof timeStr !== 'string') return 0;
            const [time, modifier] = timeStr.trim().split(' ');
            if (!time) return 0;
            let [hours, minutes, seconds] = time.split(':').map(Number);
            hours = hours || 0;
            minutes = minutes || 0;
            seconds = seconds || 0;
            if (modifier && modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12;
            else if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
            return hours * 3600 + minutes * 60 + seconds;
        }

        function parseDurationToSeconds(durationStr) {
            if (typeof durationStr !== 'string') return 0;
            const [hours, minutes, seconds] = durationStr.split(':').map(Number);
            return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
        }

        function formatSecondsToDuration(totalSeconds) {
            if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00:00';
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);
            return [hours, minutes, seconds].map(v => String(v).padStart(2, '0')).join(':');
        }

        const punchesGroupedByDay = {};
        attendanceData.forEach(record => {
            const dateKey = new Date(record.date).toISOString().split('T')[0];
            const employeeDateKey = `${record.rfid || 'Unknown'}_${dateKey}`;
            if (!punchesGroupedByDay[employeeDateKey]) {
                punchesGroupedByDay[employeeDateKey] = {
                    ...record,
                    date: dateKey,
                    rawPunches: [],
                    inTimes: [],
                    outTimes: [],
                    duration: '00:00:00',
                    latestTimestamp: new Date(record.createdAt).getTime()
                };
            }
            punchesGroupedByDay[employeeDateKey].rawPunches.push(record);
            punchesGroupedByDay[employeeDateKey].latestTimestamp = Math.max(
                punchesGroupedByDay[employeeDateKey].latestTimestamp,
                new Date(record.createdAt).getTime()
            );
        });

        const processedDays = [];

        for (const key in punchesGroupedByDay) {
            const dayData = punchesGroupedByDay[key];
            const sortedPunches = dayData.rawPunches.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            let totalDurationSeconds = 0;
            let lastInTimeSeconds = null;

            dayData.inTimes = [];
            dayData.outTimes = [];

            for (let i = 0; i < sortedPunches.length; i++) {
                const punch = sortedPunches[i];
                const punchTimeSeconds = parseTime12hToSeconds(punch.time);

                if (punch.presence) {
                    lastInTimeSeconds = punchTimeSeconds;
                    dayData.inTimes.push({ time: punch.time, isMissed: false });
                } else {
                    let isProblematicOut = false;
                    if (lastInTimeSeconds !== null) {
                        if (punchTimeSeconds > lastInTimeSeconds) {
                            totalDurationSeconds += (punchTimeSeconds - lastInTimeSeconds);
                            lastInTimeSeconds = null;
                        } else {
                            isProblematicOut = true;
                        }
                    } else {
                        isProblematicOut = true;
                    }

                    dayData.outTimes.push({
                        time: punch.time,
                        isMissed: punch.isMissedOutPunch || isProblematicOut
                    });
                }
            }

            if (lastInTimeSeconds !== null) {
                dayData.outTimes.push({
                    time: '-',
                    isMissed: true
                });
            }

            dayData.duration = formatSecondsToDuration(totalDurationSeconds);
            processedDays.push(dayData);
        }

        return processedDays.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
    }

    const downloadAttendanceCSV = () => {
        if (processedAttendance.length === 0) {
            toast.warning("No attendance data to download");
            return;
        }

        const headers = [
            'Name',
            'Employee ID (RFID)',
            'Department',
            'Date',
            'In Times',
            'Out Times',
            'Duration'
        ];

        const csvRows = processedAttendance.map(record => [
            record?.name || 'Unknown',
            record?.rfid || 'Unknown',
            record?.departmentName || 'Unknown',
            record.date || 'Unknown',
            record.inTimes.map(t => t.time).join(' | '),
            record.outTimes.map(t => t.time).join(' | '),
            record.duration || '00:00:00'
        ]);

        let csvContent = headers.join(',') + '\n';
        csvRows.forEach(row => {
            const formattedRow = row.map(cell => {
                if (cell === null || cell === undefined) return '';
                const cellString = String(cell);
                if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
                    return `"${cellString.replace(/"/g, '""')}"`;
                }
                return cellString;
            });
            csvContent += formattedRow.join(',') + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);

        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        link.setAttribute('download', `Attendance_Report_${formattedDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("Attendance report downloaded successfully!");
    };

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            render: (record) => (
                <div className="flex items-center">
                    {record?.photo && (
                        <img
                            src={record.photo
                                ? record.photo
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(record.name)}`}
                            alt="Employee"
                            className="w-8 h-8 rounded-full mr-2"
                        />
                    )}
                    <Link to={`/admin/attendance/${record.worker?._id}`} className="text-blue-600 hover:underline">
                        {record?.name || 'Unknown'}
                    </Link>
                </div>
            )
        },
        {
            header: 'Employee ID',
            accessor: 'rfid',
            render: (record) => record?.rfid || 'Unknown'
        },
        {
            header: 'Department',
            accessor: 'departmentName',
            render: (record) => record?.departmentName || 'Unknown'
        },
        {
            header: 'Date',
            accessor: 'date',
            render: (record) => record.date || 'Unknown'
        },
        {
            header: 'In Time',
            accessor: 'inTimes',
            render: (record) => (
                <div>
                    {record.inTimes.map((inPunch, index) => (
                        <div key={index} className="text-green-600">{inPunch.time}</div>
                    ))}
                </div>
            )
        },
        {
            header: 'Out Time',
            accessor: 'outTimes',
            render: (record) => (
                <div>
                    {record.outTimes.map((outPunch, index) => (
                        <div
                            key={index}
                            className={`flex items-center ${outPunch.isMissed ? 'text-gray-500' : 'text-red-500'}`}
                        >
                            {outPunch.time !== '-' ? outPunch.time : ''}
                            {outPunch.isMissed && outPunch.time !== '-' && (
                                <FaExclamationTriangle className="ml-2 text-orange-500" title="Missed Out Punch or Incomplete Pair" />
                            )}
                        </div>
                    ))}
                </div>
            )
        },
        {
            header: 'Duration',
            accessor: 'duration',
            render: (record) => record.duration || '00:00:00'
        }
    ];

    return (
        <Fragment>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Attendance Management</h1>
                <div className='flex space-x-6 justify-center items-center'>
                    {/* Batch selection removed from Attendance Management as requested */}
                    <Button
                        variant="primary"
                        className="flex items-center"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <FaPlus className="mr-2" />RFID Attendance
                    </Button>
                    <Button
                        variant="primary"
                        className="flex items-center"
                        onClick={() => setIsFaceModalOpen(true)}
                    >
                        <FaPlus className="mr-2" />Face Attendance
                    </Button>
                    <Button
                        variant="primary"
                        className="flex items-center"
                        onClick={downloadAttendanceCSV}
                    >
                        <FaDownload className="mr-2" />Download
                    </Button>
                </div>
            </div>

            <div className='bg-white border rounded-lg p-4 relative'>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by name..."
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                    />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Filter by RFID..."
                        value={filterRfid}
                        onChange={(e) => setFilterRfid(e.target.value)}
                    />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Filter by department..."
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                    />
                    <input
                        type="date"
                        className="form-input"
                        placeholder="Filter by date..."
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Spinner size="md" variant="default" />
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        data={processedAttendance}
                        noDataMessage="No attendance records found."
                    />
                )}

                <Modal
                    isOpen={isModalOpen}
                    title="RFID Input & QR Scanner"
                    size="md"
                    onClose={() => {
                        setIsModalOpen(false);
                        setWorker({ rfid: '' });
                        setConfirmAction(null);
                    }}
                >
                    {confirmAction ? (
                        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                            <h2 className="text-xl font-semibold mb-4">
                                Do you want to{' '}
                                <span
                                    className={
                                        confirmAction === 'Punch In'
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                    }
                                >
                                    {confirmAction}
                                </span>
                                ?
                            </h2>
                            <div className="flex justify-center space-x-4">
                                <Button variant="secondary" onClick={handleCancel} disabled={isPunching}>
                                    cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleConfirm}
                                    disabled={isPunching}
                                    className="flex items-center justify-center"
                                >
                                    {isPunching ? <Spinner size="sm" /> : confirmAction}
                                </Button>
                            </div>
                        </div>

                    ) : (
                        <form onSubmit={handleSubmit} className="mb-4">
                            <input
                                ref={inputRef}
                                type="text"
                                value={worker.rfid}
                                onChange={e => setWorker({ rfid: e.target.value })}
                                placeholder="RFID"
                                className="border p-2 mb-2 w-full"
                                list="rfid-suggestions"
                            />
                            <datalist id="rfid-suggestions">
                                {uniqueRfids.map((rfid, index) => (
                                    <option key={index} value={rfid} />
                                ))}
                            </datalist>
                            <Button type="submit" variant="primary" className="w-full">
                                Submit
                            </Button>
                        </form>
                    )}
                    <Webcam
                        ref={webcamRef}
                        style={{ width: '100%', maxWidth: 400, margin: '0 auto', border: '1px solid #ddd' }}
                        videoConstraints={{ facingMode: 'environment' }}
                    />
                    {qrText && (
                        <div style={{ marginTop: 20 }}>
                            <h1 className="text-lg text-center">RFID: {qrText}</h1>
                        </div>
                    )}
                </Modal>

                <Modal
                    isOpen={isFaceModalOpen}
                    title="Face Recognition Attendance"
                    size="md"
                    onClose={() => setIsFaceModalOpen(false)}
                >
                    <FaceAttendance onAttendanceSuccess={fetchAttendanceData} />
                </Modal>

                <AnimatePresence>
                    {isBatchPopupOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-20 right-5 w-full max-w-sm bg-white rounded-lg shadow-2xl border z-20"
                        >
                            <div className="flex justify-between items-center p-4 border-b">
                                <h3 className="font-bold text-lg">Employees in {selectedBatch}</h3>
                                <button onClick={() => setIsBatchPopupOpen(false)} className="text-gray-500 hover:text-gray-800">
                                    <FaTimes />
                                </button>
                            </div>
                            <div className="p-4">
                                <input
                                    type="text"
                                    className="form-input w-full mb-4"
                                    placeholder="Search by name or ID..."
                                    value={batchSearchTerm}
                                    onChange={(e) => setBatchSearchTerm(e.target.value)}
                                />
                                <div className="max-h-80 overflow-y-auto">
                                    {isFetchingBatchEmployees ? (
                                        <div className="flex justify-center items-center h-40">
                                            <Spinner />
                                        </div>
                                    ) : filteredBatchEmployees.length > 0 ? (
                                        <ul>
                                            {filteredBatchEmployees.map(employee => (
                                                <li
                                                    key={employee._id}
                                                    className="flex items-center p-2 border-b hover:bg-gray-100 cursor-pointer transition-colors duration-150"
                                                    onClick={() => handleEmployeeClick(employee._id)}
                                                >
                                                    <img
                                                        src={employee.photo ? employee.photo : `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}`}
                                                        alt={employee.name}
                                                        className="w-10 h-10 rounded-full mr-3"
                                                    />
                                                    <div>
                                                        <p className="font-semibold">{employee.name}</p>
                                                        <p className="text-sm text-gray-500">{employee.rfid}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-center text-gray-500 py-8">
                                            {batchEmployees.length > 0 ? 'No employees match your search.' : 'No employees found in this batch.'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Fragment>
    );
};

export default AttendanceManagement;